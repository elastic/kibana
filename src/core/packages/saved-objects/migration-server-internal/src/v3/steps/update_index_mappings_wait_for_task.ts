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
import { retry, poll } from '../retry';
import { resetRetry, type StateOf } from '../state';
import { assertNever, type Step, type SuccessorsOf } from '../types';
import * as UPDATE_INDEX_MAPPINGS from './update_index_mappings';
import * as UPDATE_MAPPING_MODEL_VERSIONS from './update_mapping_model_versions';

export const Name = 'UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK' as const;

/** Waits for the task that picks up the updated mappings. */
export interface State extends ExistingIndexState {
  readonly controlState: typeof Name;
  readonly updateTargetMappingsTaskId: string;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (
  state: State,
  io: IO,
  context: MigrationContext
): Step<Successors, IOResponse<'waitForPickupMappingsTask'>> => ({
  action: () => io.waitForPickupMappingsTask(state.updateTargetMappingsTaskId),
  transition: (response): StateOf<Successors> => {
    const { updateTargetMappingsTaskId, ...rest } = state;
    switch (response.type) {
      case 'retryable_es_client_error':
        return retry(state, response.message, context.maxRetryAttempts);
      case 'wait_for_task_completion_timeout':
        // the task is still running: keep polling
        return poll(state, response.message);
      case 'task_completed_with_retriable_error':
      case 'task_not_found':
        // a lost or failed task cannot complete: start a new one, within the retry budget
        return retry(
          { ...rest, controlState: UPDATE_INDEX_MAPPINGS.Name, skipRetryReset: true },
          response.message,
          context.maxRetryAttempts
        );
      case 'success':
        return { ...resetRetry(rest), controlState: UPDATE_MAPPING_MODEL_VERSIONS.Name };
      default:
        return assertNever(response);
    }
  },
});
