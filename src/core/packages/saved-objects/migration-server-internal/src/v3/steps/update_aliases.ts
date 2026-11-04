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
import { fail, retry } from '../retry';
import { appendLog, resetRetry, type StateOf } from '../state';
import { assertNever, type Step, type SuccessorsOf } from '../types';
import * as INDEX_STATE_UPDATE_DONE from './index_state_update_done';
import * as INIT from './init';

export const Name = 'UPDATE_ALIASES' as const;

/**
 * Adds the missing aliases and, on classic, removes the version aliases of previous Kibana versions.
 * The update is atomic: if another instance removed an alias first, the index is evaluated again.
 */
export interface State extends ExistingIndexState {
  readonly controlState: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (
  state: State,
  io: IO,
  context: MigrationContext
): Step<Successors, IOResponse<'updateAliases'>> => ({
  action: () => io.updateAliases(state.aliasActions),
  transition: (response): StateOf<Successors> => {
    switch (response.type) {
      case 'retryable_es_client_error':
        return retry(state, response.message, context.maxRetryAttempts);
      case 'index_not_found_exception':
        return fail(state, `The ${response.index} index was deleted while updating its aliases.`);
      case 'alias_not_found_exception': {
        // another instance removed an alias since INIT read them (e.g. a newer Kibana): evaluate the index again
        const { retryCount, pollCount, skipRetryReset, retryDelay, logs } = resetRetry(state);
        return {
          ...appendLog(
            { retryCount, pollCount, skipRetryReset, retryDelay, logs },
            'info',
            `The aliases of the ${state.currentIndex} index were updated by another instance.`
          ),
          controlState: INIT.Name,
        };
      }
      case 'remove_index_not_a_concrete_index':
        return fail(
          state,
          `Unexpected ${response.type} error while updating the aliases of the ${state.currentIndex} index.`
        );
      case 'success':
        return { ...resetRetry(state), controlState: INDEX_STATE_UPDATE_DONE.Name };
      default:
        return assertNever(response);
    }
  },
});
