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
import type { IO, UpdateTargetMappingsPropertiesResponse } from '../io';
import { transitionTo } from '../state';
import { handleRetryableFailure } from '../retry';
import type { Step, SuccessorsOf } from '../types';
import * as UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK from './update_target_mappings_properties_wait_for_task';

export const Name = 'UPDATE_TARGET_MAPPINGS_PROPERTIES' as const;

export interface State extends PostInitState {
  readonly name: typeof Name;
  readonly updatedTypesQuery: Option.Option<QueryDslQueryContainer>;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (
  state: State,
  io: IO
): Step<Successors, UpdateTargetMappingsPropertiesResponse> => ({
  action: () => io.updateAndPickupMappings(state),
  transition: (response) => {
    if (response.type === 'retryable_failure') {
      return handleRetryableFailure<typeof Name>(state, response, {
        updatedTypesQuery: state.updatedTypesQuery,
      });
    }
    return transitionTo(state, UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK.Name, {
      updateTargetMappingsTaskId: response.taskId,
    });
  },
});
