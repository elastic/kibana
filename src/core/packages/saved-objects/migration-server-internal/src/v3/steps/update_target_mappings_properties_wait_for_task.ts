/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type * as Option from 'fp-ts/Option';
import type { PostInitState } from '../migration_state';
import { assertInvariant, clause } from '../invariant_helper';
import type { IO, WaitForPickupMappingsTaskResponse } from '../io';
import { transitionTo } from '../state';
import { handleRetryableFailure, delayRetryTransition } from '../retry';
import type { Step, SuccessorsOf } from '../types';
import * as UPDATE_TARGET_MAPPINGS_META from './update_target_mappings_meta';
import * as UPDATE_TARGET_MAPPINGS_PROPERTIES from './update_target_mappings_properties';

export const Name = 'UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK' as const;

export interface State extends PostInitState {
  readonly name: typeof Name;
  readonly updateTargetMappingsTaskId: string;
  readonly updatedTypesQuery: Option.Option<QueryDslQueryContainer>;
}

type Successors = SuccessorsOf<typeof Name>;

export const assertInvariants = (state: State): void => {
  assertInvariant(
    state.updateTargetMappingsTaskId.length > 0,
    clause(Name, 'updateTargetMappingsTaskId required')
  );
};

export const step = (
  state: State,
  io: IO
): Step<Successors, WaitForPickupMappingsTaskResponse> => ({
  action: () => io.waitForPickupUpdatedMappingsTask(state),
  transition: (response) => {
    if (response.type === 'retryable_failure') {
      return handleRetryableFailure<typeof Name>(state, response, {
        updateTargetMappingsTaskId: state.updateTargetMappingsTaskId,
        updatedTypesQuery: state.updatedTypesQuery,
      });
    }
    if (response.type === 'completed') {
      return transitionTo(state, UPDATE_TARGET_MAPPINGS_META.Name, {});
    }
    if (response.type === 'wait_for_task_completion_timeout') {
      return delayRetryTransition<typeof Name>(state, response.message, Number.MAX_SAFE_INTEGER, {
        updateTargetMappingsTaskId: state.updateTargetMappingsTaskId,
        updatedTypesQuery: state.updatedTypesQuery,
      });
    }
    return transitionTo(
      { ...state, skipRetryReset: true },
      UPDATE_TARGET_MAPPINGS_PROPERTIES.Name,
      { updatedTypesQuery: state.updatedTypesQuery }
    );
  },
});
