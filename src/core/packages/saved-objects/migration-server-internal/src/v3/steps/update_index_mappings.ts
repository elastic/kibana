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
import { getMappingsUpdate } from '../mappings_update';
import type { ExistingIndexState } from '../migration_state';
import { fail, retry } from '../retry';
import { resetRetry, type StateOf } from '../state';
import { assertNever, type Step, type SuccessorsOf } from '../types';
import * as UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK from './update_index_mappings_wait_for_task';
import * as INDEX_STATE_UPDATE_DONE from './index_state_update_done';
import * as UPDATE_ALIASES from './update_aliases';
import * as UPDATE_MAPPING_MODEL_VERSIONS from './update_mapping_model_versions';

export const Name = 'UPDATE_INDEX_MAPPINGS' as const;

/** Applies the additive mappings changes, and picks them up in the affected documents if `pickupUpdatedMappings`. */
export interface State extends ExistingIndexState {
  readonly controlState: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (
  state: State,
  io: IO,
  context: MigrationContext
): Step<Successors, IOResponse<'updateMappings'>> => ({
  action: () => {
    const { mappings, pickupQuery } = getMappingsUpdate(context, state.previousMappings);
    return io.updateMappings(
      state.currentIndex,
      mappings,
      context.pickupUpdatedMappings ? pickupQuery : undefined
    );
  },
  transition: (response): StateOf<Successors> => {
    switch (response.type) {
      case 'retryable_es_client_error':
        return retry(state, response.message, context.maxRetryAttempts);
      case 'incompatible_mapping_exception':
        return fail(state, `Incompatible mappings change on the ${state.currentIndex} index.`);
      case 'success': {
        const { taskId } = response.value;
        if (taskId) {
          return {
            ...resetRetry(state),
            controlState: UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK.Name,
            updateTargetMappingsTaskId: taskId,
          };
        }
        if (context.pickupUpdatedMappings) {
          return { ...resetRetry(state), controlState: UPDATE_MAPPING_MODEL_VERSIONS.Name };
        }
        // mappingVersions stay outdated, so that the next migration picks up the mappings
        return state.aliasActions.length > 0
          ? { ...resetRetry(state), controlState: UPDATE_ALIASES.Name }
          : { ...resetRetry(state), controlState: INDEX_STATE_UPDATE_DONE.Name };
      }
      default:
        return assertNever(response);
    }
  },
});
