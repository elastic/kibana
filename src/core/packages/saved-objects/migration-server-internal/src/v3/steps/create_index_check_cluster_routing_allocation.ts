/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PostInitState } from '../migration_state';
import type { IO, ClusterRoutingAllocationResponse } from '../io';
import { resetRetry, transitionTo } from '../state';
import { handleRetryableFailure, delayRetryTransition, clusterRoutingRetryMessage } from '../retry';
import type { Step, SuccessorsOf } from '../types';
import * as CREATE_NEW_TARGET from './create_new_target';

export const Name = 'CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION' as const;

export interface State extends PostInitState {
  readonly name: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (state: State, io: IO): Step<Successors, ClusterRoutingAllocationResponse> => ({
  action: () => io.checkClusterRoutingAllocation(),
  transition: (response) => {
    if (response.type === 'retryable_failure') {
      return handleRetryableFailure<typeof Name>(state, response, {});
    }
    if (response.type === 'ok') {
      return transitionTo(resetRetry(state), CREATE_NEW_TARGET.Name, {});
    }
    return delayRetryTransition<typeof Name>(
      state,
      clusterRoutingRetryMessage(state),
      state.retryAttempts,
      {}
    );
  },
});
