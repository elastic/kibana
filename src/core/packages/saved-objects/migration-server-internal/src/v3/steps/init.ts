/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationContext } from '../context';
import { evaluateIndex, hasWrites, type IndexEvaluation } from '../evaluate_index';
import type { IO, IOResponse } from '../io';
import type { BaseState } from '../migration_state';
import { fail, retry } from '../retry';
import { appendLog, resetRetry, type StateOf } from '../state';
import { assertNever, type Step, type SuccessorsOf } from '../types';
import * as CHECK_CLUSTER_ROUTING_ALLOCATION from './check_cluster_routing_allocation';
import * as CREATE_TARGET_INDEX from './create_target_index';
import * as INDEX_STATE_UPDATE_DONE from './index_state_update_done';
import * as WAIT_FOR_MIGRATION_COMPLETION from './wait_for_migration_completion';
import * as WAIT_FOR_YELLOW_SOURCE from './wait_for_yellow_source';

export const Name = 'INIT' as const;

export interface State extends BaseState {
  readonly controlState: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

const fromEvaluation = (
  state: State,
  evaluation: IndexEvaluation,
  context: MigrationContext
): StateOf<Successors> => {
  switch (evaluation.type) {
    case 'fatal':
      return fail(state, evaluation.reason);
    case 'wait':
      return {
        ...appendLog(
          state,
          'info',
          `${evaluation.reason} Waiting until another Kibana instance completes the migration.`
        ),
        controlState: WAIT_FOR_MIGRATION_COMPLETION.Name,
        retryDelay: WAIT_FOR_MIGRATION_COMPLETION.WAIT_FOR_MIGRATION_COMPLETION_DELAY_MS,
      };
    case 'create': {
      const { currentIndex, aliases } = evaluation;
      return context.checkClusterRoutingAllocation
        ? {
            ...state,
            controlState: CHECK_CLUSTER_ROUTING_ALLOCATION.Name,
            target: 'create',
            currentIndex,
            aliases,
          }
        : { ...state, controlState: CREATE_TARGET_INDEX.Name, currentIndex, aliases };
    }
    case 'update': {
      const { type, logs, ...plan } = evaluation;
      const next = { ...state, ...plan, logs: [...state.logs, ...logs] };
      if (!hasWrites(evaluation)) {
        return { ...next, controlState: INDEX_STATE_UPDATE_DONE.Name };
      }
      return context.checkClusterRoutingAllocation
        ? { ...next, controlState: CHECK_CLUSTER_ROUTING_ALLOCATION.Name, target: 'update' }
        : { ...next, controlState: WAIT_FOR_YELLOW_SOURCE.Name };
    }
    default:
      return assertNever(evaluation);
  }
};

export const step = (
  state: State,
  io: IO,
  context: MigrationContext
): Step<Successors, IOResponse<'fetchIndices'>> => ({
  action: io.fetchIndices,
  transition: (response) => {
    switch (response.type) {
      case 'retryable_es_client_error':
        return retry(state, response.message, context.maxRetryAttempts);
      case 'success':
        return fromEvaluation(resetRetry(state), evaluateIndex(context, response.value), context);
      default:
        return assertNever(response);
    }
  },
});
