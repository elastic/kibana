/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/Either';
import type * as TaskEither from 'fp-ts/TaskEither';
import type { estypes } from '@elastic/elasticsearch';
import { errors as esErrors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  catchRetryableEsClientErrors,
  type RetryableEsClientError,
} from './catch_retryable_es_client_errors';
import {
  isWriteBlockException,
  isIndexNotFoundException,
  isUnavailableShardsException,
} from './es_errors';
import { DEFAULT_TIMEOUT, WAIT_FOR_ALL_SHARDS_TO_BE_ACTIVE } from './constants';
import type {
  TargetIndexHadWriteBlock,
  RequestEntityTooLargeException,
  IndexNotFound,
  UnavailableShardsException,
} from '.';
import type { BulkOperation } from '../model/create_batches';

/** @internal */
export interface BulkOverwriteTransformedDocumentsParams {
  client: ElasticsearchClient;
  index: string;
  operations: BulkOperation[];
  refresh?: estypes.Refresh;
  /**
   * If true, we prevent Elasticsearch from auto-creating the index if it
   * doesn't exist. We use the ES paramater require_alias: true so `index`
   * must be an alias, otherwise the bulk index will fail.
   */
  useAliasToPreventAutoCreate?: boolean;
  /**
   * How long to wait for the request to complete, including waiting for
   * active shards. Defaults to DEFAULT_TIMEOUT (300s).
   */
  timeout?: string;
  /**
   * When true, call `_cluster/allocation/explain` on unavailable-shard failures
   * and include the decider reason in the returned error message. Callers
   * should gate this on retry count to avoid hitting the cluster API on every
   * retry of a long-running failure.
   */
  fetchAllocationExplain?: boolean;
}

/**
 * Write the up-to-date transformed documents to the index, overwriting any
 * documents that are still on their outdated version.
 */
export const bulkOverwriteTransformedDocuments =
  ({
    client,
    index,
    operations,
    refresh = false,
    useAliasToPreventAutoCreate = false,
    timeout = DEFAULT_TIMEOUT,
    fetchAllocationExplain = false,
  }: BulkOverwriteTransformedDocumentsParams): TaskEither.TaskEither<
    | RetryableEsClientError
    | TargetIndexHadWriteBlock
    | IndexNotFound
    | RequestEntityTooLargeException
    | UnavailableShardsException,
    'bulk_index_succeeded'
  > =>
  async () => {
    let res: Awaited<ReturnType<typeof client.bulk>>;
    try {
      res = await client.bulk({
        // Because we only add aliases in the MARK_VERSION_INDEX_READY step we
        // can't bulkIndex to an alias with require_alias=true. This means if
        // users tamper during this operation (delete indices or restore a
        // snapshot), we could end up auto-creating an index without the correct
        // mappings. Such tampering could lead to many other problems and is
        // probably unlikely so for now we'll accept this risk and wait till
        // system indices puts in place a hard control.
        index,
        require_alias: useAliasToPreventAutoCreate,
        wait_for_active_shards: WAIT_FOR_ALL_SHARDS_TO_BE_ACTIVE,
        refresh,
        timeout,
        filter_path: ['items.*.error'],
        // we need to unwrap the existing BulkIndexOperationTuple's
        operations: operations.flat(),
      });
    } catch (error) {
      if (error instanceof esErrors.ResponseError && error.statusCode === 413) {
        return Either.left({ type: 'request_entity_too_large_exception' as const });
      }
      if (error instanceof esErrors.ElasticsearchClientError) {
        return catchRetryableEsClientErrors(error);
      }
      throw error;
    }

    // Filter out version_conflict_engine_exception since these just mean
    // that another instance already updated these documents
    const errors: estypes.ErrorCause[] = (res.items ?? [])
      .filter((item) => item.index?.error)
      .map((item) => item.index!.error!)
      .filter(({ type }) => type !== 'version_conflict_engine_exception');

    if (errors.length === 0) {
      return Either.right('bulk_index_succeeded' as const);
    }

    if (errors.every(isWriteBlockException)) {
      return Either.left({ type: 'target_index_had_write_block' as const });
    }

    if (errors.every(isIndexNotFoundException)) {
      return Either.left({ type: 'index_not_found_exception' as const, index });
    }

    if (errors.every(isUnavailableShardsException)) {
      let allocationReason = '';
      if (fetchAllocationExplain) {
        try {
          const explain = await explainShardAllocation(client, index);
          allocationReason = formatAllocationExplanation(explain);
        } catch (explainError) {
          allocationReason = `explain unavailable: ${
            explainError instanceof Error ? explainError.message : String(explainError)
          }`;
        }
      }
      return Either.left({
        type: 'unavailable_shards_exception' as const,
        message: allocationReason
          ? `[${index}] Not enough active copies to meet shard count of [ALL]. Shard allocation explain: ${allocationReason}`
          : `[${index}] Not enough active copies to meet shard count of [ALL]`,
      });
    }

    throw new Error(JSON.stringify(errors));
  };

const explainShardAllocation = async (
  client: ElasticsearchClient,
  index: string
): Promise<estypes.ClusterAllocationExplainResponse> => {
  const primaryExplain = await client.cluster.allocationExplain(
    { index, shard: 0, primary: true, master_timeout: '30s' },
    { maxRetries: 0 }
  );
  if (primaryExplain.current_state === 'started') {
    const settingsResponse = await client.indices.getSettings({
      index,
      filter_path: ['*.settings.index.number_of_replicas'],
    });
    const numberOfReplicas = parseInt(
      String(Object.values(settingsResponse)[0]?.settings?.index?.number_of_replicas ?? 0),
      10
    );
    if (numberOfReplicas > 0) {
      return await client.cluster.allocationExplain(
        { index, shard: 0, primary: false, master_timeout: '30s' },
        { maxRetries: 0 }
      );
    }
  }
  return primaryExplain;
};

const formatAllocationExplanation = (explain: estypes.ClusterAllocationExplainResponse): string => {
  const parts: string[] = [];

  if (explain.unassigned_info) {
    const { reason, details } = explain.unassigned_info;
    parts.push(`unassigned reason: ${details ? `${reason}: ${details}` : reason}`);
  }

  if (explain.allocate_explanation) {
    parts.push(explain.allocate_explanation.replace(/\.$/, ''));
  }

  if (explain.node_allocation_decisions) {
    const groups = new Map<
      string,
      { decider: string; decision: string; explanation: string; count: number; firstNodeName: string }
    >();

    for (const node of explain.node_allocation_decisions) {
      for (const decider of node.deciders ?? []) {
        if (decider.decision === 'NO' || decider.decision === 'THROTTLE') {
          const key = `${decider.decider}|${decider.decision}`;
          const existing = groups.get(key);
          if (existing) {
            existing.count++;
          } else {
            groups.set(key, {
              decider: decider.decider,
              decision: decider.decision,
              explanation: decider.explanation,
              count: 1,
              firstNodeName: node.node_name,
            });
          }
        }
      }
    }

    if (groups.size > 0) {
      const blockingReasons = [...groups.values()].map(
        ({ decider, decision, explanation, count, firstNodeName }) => {
          const nodeLabel =
            count === 1 ? firstNodeName : `${count} nodes (${firstNodeName}, +${count - 1})`;
          return `[${decider}] ${decision} on ${nodeLabel}: ${explanation}`;
        }
      );
      parts.push(`blocking deciders: ${blockingReasons.join('; ')}`);
    }
  }

  return parts.join('. ');
};
