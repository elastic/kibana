/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationContext } from '../context';
import type { IO, IOResponse } from '../io';
import type { ExistingIndexState } from '../migration_state';
import { retry } from '../retry';
import { resetRetry, type StateOf } from '../state';
import { assertNever, type Step, type SuccessorsOf } from '../types';
import * as INDEX_STATE_UPDATE_DONE from './index_state_update_done';
import * as UPDATE_ALIASES from './update_aliases';
import * as UPDATE_INDEX_MAPPINGS from './update_index_mappings';

export const Name = 'WAIT_FOR_YELLOW_SOURCE' as const;

/** Waits for the primary shards of the index to be allocated before writing to it. */
export interface State extends ExistingIndexState {
  readonly controlState: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

const proceed = (state: State): StateOf<Successors> => {
  if (state.updateMappings) {
    return { ...state, controlState: UPDATE_INDEX_MAPPINGS.Name };
  }
  if (state.aliasActions.length > 0) {
    return { ...state, controlState: UPDATE_ALIASES.Name };
  }
  return { ...state, controlState: INDEX_STATE_UPDATE_DONE.Name };
};

export const step = (
  state: State,
  io: IO,
  context: MigrationContext
): Step<Successors, IOResponse<'waitForYellowIndex'>> => ({
  action: () => io.waitForYellowIndex(state.currentIndex),
  transition: (response) => {
    switch (response.type) {
      case 'retryable_es_client_error':
        return retry(state, response.message, context.maxRetryAttempts);
      case 'index_not_yellow_timeout':
        return retry(
          state,
          `${response.message} Refer to ${context.migrationDocLinks.repeatedTimeoutRequests} for information on how to resolve the issue.`,
          context.maxRetryAttempts
        );
      case 'success':
        return proceed(resetRetry(state));
      default:
        return assertNever(response);
    }
  },
});
