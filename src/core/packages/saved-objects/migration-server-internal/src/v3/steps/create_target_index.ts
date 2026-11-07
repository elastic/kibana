/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CLUSTER_SHARD_LIMIT_EXCEEDED_REASON } from '../../common/constants';
import type { MigrationContext } from '../context';
import type { IO, IOResponse } from '../io';
import type { CreateIndexState } from '../migration_state';
import { fail, retry } from '../retry';
import { appendLog, resetRetry, type StateOf } from '../state';
import { assertNever, type Step, type SuccessorsOf } from '../types';
import * as DONE from './done';
import * as INIT from './init';

export const Name = 'CREATE_TARGET_INDEX' as const;

/** Creates the index, with up-to-date mappings and `_meta`, and its aliases. */
export interface State extends CreateIndexState {
  readonly controlState: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (
  state: State,
  io: IO,
  context: MigrationContext
): Step<Successors, IOResponse<'createIndex'>> => ({
  action: () => io.createIndex(state.currentIndex, state.aliases),
  transition: (response): StateOf<Successors> => {
    switch (response.type) {
      case 'retryable_es_client_error':
        return retry(state, response.message, context.maxRetryAttempts);
      case 'index_not_green_timeout':
        return retry(
          state,
          `${response.message} Refer to ${context.migrationDocLinks.repeatedTimeoutRequests} for information on how to resolve the issue.`,
          context.maxRetryAttempts
        );
      case 'cluster_shard_limit_exceeded':
        return fail(
          state,
          `${CLUSTER_SHARD_LIMIT_EXCEEDED_REASON} See ${context.migrationDocLinks.clusterShardLimitExceeded}`
        );
      case 'success': {
        const { aliases, currentIndex, ...base } = resetRetry(state);
        if (response.value === 'index_already_exists') {
          // another instance created it concurrently: evaluate it from scratch
          return {
            ...appendLog(base, 'info', `The ${currentIndex} index already exists.`),
            controlState: INIT.Name,
          };
        }
        return { ...base, controlState: DONE.Name, currentIndex };
      }
      default:
        return assertNever(response);
    }
  },
});
