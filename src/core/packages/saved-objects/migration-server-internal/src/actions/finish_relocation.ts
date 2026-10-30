/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { AliasAction } from './update_aliases';
import type { RetryableEsClientError } from './catch_retryable_es_client_errors';
import { fetchIndices } from './fetch_indices';
import type { WaitGroup } from '../kibana_migrator_utils';
import { getAliases, versionMigrationCompleted } from '../model/helpers';

export const RELOCATION_ALREADY_MIGRATED = 'relocation_already_migrated' as const;
export const RELOCATION_STILL_REQUIRED = 'relocation_still_required' as const;

export type RelocationSkipOutcome =
  | typeof RELOCATION_ALREADY_MIGRATED
  | typeof RELOCATION_STILL_REQUIRED;

export interface RelocationWaitGroups {
  readyToReindex: WaitGroup<void>;
  doneReindexing: WaitGroup<void>;
  updateRelocationAliases: WaitGroup<AliasAction[]>;
}

/**
 * Resolve every relocation barrier this migrator belongs to, then drop the temp
 * index it may have created. The alias slot is resolved with an empty action
 * list so a sibling's combined updateAliases does not remove the live alias.
 */
async function releaseRelocationWaitGroups(
  waitGroups: RelocationWaitGroups,
  client: ElasticsearchClient,
  tempIndex: string
): Promise<void> {
  waitGroups.readyToReindex.resolve();
  waitGroups.doneReindexing.resolve();
  waitGroups.updateRelocationAliases.resolve([]);

  try {
    await client.indices.delete({ index: tempIndex, ignore_unavailable: true });
  } catch {
    // The live aliases are already published. A leftover temp index must not
    // keep this node from becoming ready.
  }
}

/** @internal */
export interface FinishRelocationEarlyParams extends RelocationWaitGroups {
  client: ElasticsearchClient;
  tempIndex: string;
}

/**
 * Another node already published this index's aliases. Skip the copy and
 * unblock sibling migrators waiting on the relocation barriers.
 */
export function finishRelocationEarly({
  client,
  tempIndex,
  ...waitGroups
}: FinishRelocationEarlyParams): TaskEither.TaskEither<never, typeof RELOCATION_ALREADY_MIGRATED> {
  return async () => {
    await releaseRelocationWaitGroups(waitGroups, client, tempIndex);
    return Either.right(RELOCATION_ALREADY_MIGRATED);
  };
}

/** @internal */
export interface FinishRelocationIfPublishedParams extends RelocationWaitGroups {
  client: ElasticsearchClient;
  currentAlias: string;
  versionAlias: string;
  tempIndex: string;
}

/**
 * Re-read the aliases after READY_TO_REINDEX_SYNC. A migrator blocked on that
 * barrier may have observed the pre-publication alias; the sibling that
 * published them will not reach this step.
 */
export function finishRelocationIfPublished({
  client,
  currentAlias,
  versionAlias,
  tempIndex,
  ...waitGroups
}: FinishRelocationIfPublishedParams): TaskEither.TaskEither<
  RetryableEsClientError,
  RelocationSkipOutcome
> {
  return async () => {
    const fetched = await fetchIndices({
      client,
      indices: [currentAlias, versionAlias],
    })();

    if (Either.isLeft(fetched)) {
      return fetched;
    }

    const aliases = getAliases(fetched.right);
    if (
      Either.isLeft(aliases) ||
      !versionMigrationCompleted(currentAlias, versionAlias, aliases.right)
    ) {
      return Either.right(RELOCATION_STILL_REQUIRED);
    }

    await releaseRelocationWaitGroups(waitGroups, client, tempIndex);
    return Either.right(RELOCATION_ALREADY_MIGRATED);
  };
}
