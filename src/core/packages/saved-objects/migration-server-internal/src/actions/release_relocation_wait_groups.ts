/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/lib/Either';
import type * as TaskEither from 'fp-ts/lib/TaskEither';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { AliasAction } from './update_aliases';
import type { WaitGroup } from '../kibana_migrator_utils';

/** @internal */
export interface ReleaseRelocationWaitGroupsParams {
  client: ElasticsearchClient;
  tempIndex: string;
  readyToReindex: WaitGroup<void>;
  doneReindexing: WaitGroup<void>;
  updateRelocationAliases: WaitGroup<AliasAction[]>;
}

/**
 * Resolve every relocation barrier this migrator belongs to, then drop the temp
 * index it may have created. The alias slot is resolved with an empty action
 * list, so a sibling's combined updateAliases does not remove the live alias.
 */
export const releaseRelocationWaitGroups =
  ({
    client,
    tempIndex,
    readyToReindex,
    doneReindexing,
    updateRelocationAliases,
  }: ReleaseRelocationWaitGroupsParams): TaskEither.TaskEither<
    never,
    'relocation_wait_groups_released'
  > =>
  async () => {
    readyToReindex.resolve();
    doneReindexing.resolve();
    updateRelocationAliases.resolve([]);

    try {
      await client.indices.delete({ index: tempIndex, ignore_unavailable: true });
    } catch {
      // The live aliases are already published. A leftover temp index must not
      // keep this node from becoming ready.
    }

    return Either.right('relocation_wait_groups_released' as const);
  };
