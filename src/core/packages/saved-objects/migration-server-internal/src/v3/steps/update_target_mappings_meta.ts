/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PostInitState } from '../migration_state';
import type { IO, UpdateMappingsMetaResponse } from '../io';
import { resetRetry, transitionTo } from '../state';
import { handleRetryableFailure } from '../retry';
import type { Step, SuccessorsOf } from '../types';
import * as CHECK_VERSION_INDEX_READY_ACTIONS from './check_version_index_ready_actions';

export const Name = 'UPDATE_TARGET_MAPPINGS_META' as const;

export interface State extends PostInitState {
  readonly name: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (state: State, io: IO): Step<Successors, UpdateMappingsMetaResponse> => ({
  action: () => io.updateMappingsMeta(state),
  transition: (response) => {
    if (response.type === 'retryable_failure') {
      return handleRetryableFailure<typeof Name>(state, response, {});
    }
    return transitionTo(resetRetry(state), CHECK_VERSION_INDEX_READY_ACTIONS.Name, {});
  },
});
