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
import type { CreateIndexState, ExistingIndexState } from '../migration_state';
import { retry } from '../retry';
import { resetRetry, type StateOf } from '../state';
import { assertNever, type Step, type SuccessorsOf } from '../types';
import * as CREATE_TARGET_INDEX from './create_target_index';
import * as WAIT_FOR_YELLOW_SOURCE from './wait_for_yellow_source';

export const Name = 'CHECK_CLUSTER_ROUTING_ALLOCATION' as const;

/** Checks that shards can be allocated before writing, on both the create and the update paths. */
export type State =
  | (CreateIndexState & { readonly controlState: typeof Name; readonly target: 'create' })
  | (ExistingIndexState & { readonly controlState: typeof Name; readonly target: 'update' });

type Successors = SuccessorsOf<typeof Name>;

const proceed = (state: State): StateOf<Successors> => {
  if (state.target === 'create') {
    const { target, ...rest } = resetRetry(state);
    return { ...rest, controlState: CREATE_TARGET_INDEX.Name };
  }
  const { target, ...rest } = resetRetry(state);
  return { ...rest, controlState: WAIT_FOR_YELLOW_SOURCE.Name };
};

export const step = (
  state: State,
  io: IO,
  context: MigrationContext
): Step<Successors, IOResponse<'checkClusterRoutingAllocation'>> => ({
  action: io.checkClusterRoutingAllocation,
  transition: (response) => {
    switch (response.type) {
      case 'retryable_es_client_error':
        return retry(state, response.message, context.maxRetryAttempts);
      case 'incompatible_cluster_routing_allocation':
        return retry(
          state,
          `[incompatible_cluster_routing_allocation] Incompatible Elasticsearch cluster settings detected. Remove the persistent and transient Elasticsearch cluster setting 'cluster.routing.allocation.enable' or set it to a value of 'all' to allow migrations to proceed. Refer to ${context.migrationDocLinks.routingAllocationDisabled} for more information on how to resolve the issue.`,
          context.maxRetryAttempts
        );
      case 'success':
        return proceed(state);
      default:
        return assertNever(response);
    }
  },
});
