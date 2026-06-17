/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PostInitState } from '../migration_state';
import type { IO, CreateNewTargetResponse } from '../io';
import { transitionTo } from '../state';
import { handleRetryableFailure, delayRetryTransition } from '../retry';
import { CLUSTER_SHARD_LIMIT_EXCEEDED_REASON } from '../../common/constants';
import type { Step, SuccessorsOf } from '../types';
import * as OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT from './outdated_documents_search_open_pit';
import * as CHECK_VERSION_INDEX_READY_ACTIONS from './check_version_index_ready_actions';
import * as FATAL from './fatal';

export const Name = 'CREATE_NEW_TARGET' as const;

export interface State extends PostInitState {
  readonly name: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (state: State, io: IO): Step<Successors, CreateNewTargetResponse> => ({
  action: () => io.createIndex(state),
  transition: (response) => {
    if (response.type === 'retryable_failure') {
      return handleRetryableFailure<typeof Name>(state, response, {});
    }
    if (response.type === 'index_already_exists') {
      return transitionTo(state, OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.Name, {});
    }
    if (response.type === 'created') {
      return transitionTo(state, CHECK_VERSION_INDEX_READY_ACTIONS.Name, {});
    }
    if (response.type === 'index_not_green_timeout') {
      return delayRetryTransition(
        state,
        `${response.message} Refer to ${state.migrationDocLinks.repeatedTimeoutRequests} for information on how to resolve the issue.`,
        state.retryAttempts,
        {}
      );
    }
    return transitionTo(state, FATAL.Name, {
      reason: `${CLUSTER_SHARD_LIMIT_EXCEEDED_REASON} See ${state.migrationDocLinks.clusterShardLimitExceeded}`,
    });
  },
});
