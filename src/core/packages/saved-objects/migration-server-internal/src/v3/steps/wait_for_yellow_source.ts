/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SourceExistsState } from '../migration_state';
import type { IO, WaitForYellowSourceResponse } from '../io';
import { resetRetry, transitionTo } from '../state';
import { handleRetryableFailure, delayRetryTransition } from '../retry';
import type { Step, SuccessorsOf } from '../types';
import * as UPDATE_SOURCE_MAPPINGS_PROPERTIES from './update_source_mappings_properties';

export const Name = 'WAIT_FOR_YELLOW_SOURCE' as const;

export interface State extends SourceExistsState {
  readonly name: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (state: State, io: IO): Step<Successors, WaitForYellowSourceResponse> => ({
  action: () => io.waitForYellowSource(state),
  transition: (response) => {
    if (response.type === 'retryable_failure') {
      return handleRetryableFailure<typeof Name>(state, response, {});
    }
    if (response.type === 'yellow') {
      return transitionTo(resetRetry(state), UPDATE_SOURCE_MAPPINGS_PROPERTIES.Name, {});
    }
    return delayRetryTransition(
      state,
      `${response.message} Refer to ${state.migrationDocLinks.repeatedTimeoutRequests} for information on how to resolve the issue.`,
      state.retryAttempts,
      {}
    );
  },
});
