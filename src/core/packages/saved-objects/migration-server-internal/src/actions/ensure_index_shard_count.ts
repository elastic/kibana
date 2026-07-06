/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';

/** @internal */
export interface EnsureIndexShardCountParams {
  client: ElasticsearchClient;
  logger: Logger;
  /** The alias that points to the index to reconcile, e.g. `.kibana_task_manager` */
  alias: string;
  /** The desired number of primary shards for the index behind `alias` */
  numberOfShards: number;
}

/**
 * Bump the trailing numeric suffix of a concrete index name (e.g.
 * `.kibana_task_manager_9.2.0_001` -> `.kibana_task_manager_9.2.0_002`) so the
 * resharded index keeps following the saved objects naming convention. Two
 * Kibana nodes computing this for the same source will produce the same target,
 * which lets the concurrent `_split` calls de-duplicate. Falls back to appending
 * `_002` when there is no numeric suffix.
 */
const getSplitTargetIndexName = (sourceIndex: string): string => {
  const match = sourceIndex.match(/^(.*_)(\d+)$/);
  if (!match) {
    return `${sourceIndex}_002`;
  }
  const [, prefix, sequence] = match;
  const next = String(Number(sequence) + 1).padStart(sequence.length, '0');
  return `${prefix}${next}`;
};

/**
 * Ensures the index behind `alias` has at least `numberOfShards` primary shards,
 * splitting it if necessary.
 *
 * Elasticsearch cannot change the shard count of a live index in place, so this
 * performs a `_split` into a new index and atomically moves the aliases over.
 * The split hard-links Lucene segments (no document copy), so the required
 * write-block window on the source is short; writers that retry transient
 * failures (e.g. Task Manager) are delayed rather than losing data.
 *
 * Runs during startup migration on every Kibana node, so it must be:
 *  - Idempotent: a no-op once the index already has enough shards (making
 *    re-runs and concurrent nodes safe).
 *  - Non-fatal: a failure logs and leaves the index at its current shard count
 *    rather than blocking startup. If a failure occurs after the source has been
 *    write-blocked but before the alias swap, the block is removed so writers
 *    are never left wedged.
 */
export const ensureIndexShardCount = async ({
  client,
  logger,
  alias,
  numberOfShards,
}: EnsureIndexShardCountParams): Promise<void> => {
  let indicesForAlias: Record<string, { aliases?: Record<string, unknown> }>;
  try {
    indicesForAlias = await client.indices.getAlias({ name: alias });
  } catch (error) {
    if (error?.meta?.statusCode === 404) {
      // Fresh deployment: the index does not exist yet. It will be created with
      // the desired shard count by the `createIndex` migration action.
      return;
    }
    throw error;
  }

  const sourceIndices = Object.keys(indicesForAlias);
  if (sourceIndices.length !== 1) {
    logger.warn(
      `[savedObjects] Skipping shard reconciliation for "${alias}": expected exactly 1 index but found ${
        sourceIndices.length
      } [${sourceIndices.join(', ')}].`
    );
    return;
  }
  const sourceIndex = sourceIndices[0];

  const settingsResponse = await client.indices.getSettings({
    index: sourceIndex,
    include_defaults: true,
  });
  const settings = settingsResponse[sourceIndex]?.settings?.index ?? {};
  const defaults = settingsResponse[sourceIndex]?.defaults?.index ?? {};

  const currentShards = Number(settings.number_of_shards ?? defaults.number_of_shards);
  const routingShards = Number(
    settings.number_of_routing_shards ?? defaults.number_of_routing_shards
  );

  if (!Number.isFinite(currentShards) || currentShards >= numberOfShards) {
    // Already at (or above) the desired shard count. This early return is what
    // makes the step idempotent across restarts and concurrent Kibana nodes.
    return;
  }

  // `_split` requires the target shard count to be a multiple of the source
  // count and to divide the source `number_of_routing_shards`. Existing indices
  // use the ES default (power-of-two) routing shards, so non-power-of-two
  // targets are rejected. Skip (rather than fail startup) if we can't split.
  const canSplit =
    numberOfShards % currentShards === 0 &&
    (!Number.isFinite(routingShards) || routingShards % numberOfShards === 0);
  if (!canSplit) {
    logger.warn(
      `[savedObjects] Cannot split "${sourceIndex}" from ${currentShards} to ${numberOfShards} shards (number_of_routing_shards=${routingShards}). Leaving the index unchanged.`
    );
    return;
  }

  const targetIndex = getSplitTargetIndexName(sourceIndex);
  let writeBlockApplied = false;
  let aliasesSwapped = false;

  try {
    logger.info(
      `[savedObjects] Resharding "${sourceIndex}" from ${currentShards} to ${numberOfShards} primary shards via _split into "${targetIndex}".`
    );

    // 1. Block writes on the source so it can be split.
    await client.indices.putSettings({
      index: sourceIndex,
      settings: { 'index.blocks.write': true },
    });
    writeBlockApplied = true;

    // 2. Split into the target index, overriding the shard count and clearing
    //    the write block that the target would otherwise inherit.
    try {
      await client.indices.split({
        index: sourceIndex,
        target: targetIndex,
        settings: {
          'index.number_of_shards': numberOfShards,
          'index.blocks.write': false,
        },
      });
    } catch (error) {
      // Another Kibana node may have already created the split target.
      if (error?.body?.error?.type !== 'resource_already_exists_exception') {
        throw error;
      }
    }

    // 3. Wait for the target index to be fully allocated before cutting over.
    await client.cluster.health({
      index: targetIndex,
      wait_for_status: 'green',
      timeout: '120s',
    });

    // 4. Atomically move every alias from the source to the target so readers
    //    and writers follow to the resharded index with no missing-alias
    //    window. Re-check first in case another node already swapped.
    const currentTargets = Object.keys(await client.indices.getAlias({ name: alias }));
    if (currentTargets.length === 1 && currentTargets[0] === targetIndex) {
      aliasesSwapped = true;
    } else {
      const sourceAliases = Object.keys(indicesForAlias[sourceIndex]?.aliases ?? {});
      const actions = sourceAliases.flatMap((aliasName) => [
        { remove: { index: sourceIndex, alias: aliasName } },
        { add: { index: targetIndex, alias: aliasName } },
      ]);
      try {
        await client.indices.updateAliases({ actions });
        aliasesSwapped = true;
      } catch (error) {
        // Tolerate a concurrent swap by another node; verify the final state.
        const verify = Object.keys(await client.indices.getAlias({ name: alias }));
        if (verify.length === 1 && verify[0] === targetIndex) {
          aliasesSwapped = true;
        } else {
          throw error;
        }
      }
    }

    // 5. Remove the now-unaliased source index. Best-effort: a leftover index
    //    is harmless because migrations resolve indices via aliases.
    try {
      await client.indices.delete({ index: sourceIndex });
    } catch (error) {
      if (error?.meta?.statusCode !== 404) {
        logger.warn(
          `[savedObjects] Failed to delete old index "${sourceIndex}" after resharding: ${error.message}`
        );
      }
    }

    logger.info(
      `[savedObjects] Successfully resharded "${alias}" to ${numberOfShards} primary shards ("${targetIndex}").`
    );
  } catch (error) {
    // Never leave the source write-blocked without having completed the swap,
    // otherwise writers (e.g. Task Manager) would be unable to write.
    if (writeBlockApplied && !aliasesSwapped) {
      try {
        await client.indices.putSettings({
          index: sourceIndex,
          settings: { 'index.blocks.write': false },
        });
      } catch (cleanupError) {
        logger.error(
          `[savedObjects] Failed to remove write block on "${sourceIndex}" after a failed reshard: ${cleanupError.message}`
        );
      }
    }
    // Non-fatal: continue startup at the existing shard count.
    logger.error(
      `[savedObjects] Failed to reshard "${alias}" to ${numberOfShards} primary shards: ${error.message}. Continuing with the existing shard count.`
    );
  }
};
