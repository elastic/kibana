/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SourceExistsState } from '../migration_state';
import { assertInvariant, clause } from '../invariant_helper';
import type { IO, CleanupWaitForTaskResponse } from '../io';
import { transitionTo } from '../state';
import { handleRetryableFailure, delayRetryTransition } from '../retry';
import type { Step, SuccessorsOf } from '../types';
import * as PREPARE_COMPATIBLE_MIGRATION from './prepare_compatible_migration';
import * as CLEANUP_UNKNOWN_AND_EXCLUDED from './cleanup_unknown_and_excluded';
import * as FATAL from './fatal';

export const Name = 'CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK' as const;

export interface State extends SourceExistsState {
  readonly name: typeof Name;
  readonly deleteByQueryTaskId: string;
  readonly mustRefresh?: boolean;
}

type Successors = SuccessorsOf<typeof Name>;

export const assertInvariants = (state: State): void => {
  assertInvariant(
    state.deleteByQueryTaskId.length > 0,
    clause(Name, 'deleteByQueryTaskId required')
  );
};

export const step = (state: State, io: IO): Step<Successors, CleanupWaitForTaskResponse> => ({
  action: () => io.waitForDeleteByQueryTask(state),
  transition: (response) => {
    if (response.type === 'retryable_failure') {
      return handleRetryableFailure<typeof Name>(state, response, {});
    }
    if (response.type === 'wait_for_task_completion_timeout') {
      return delayRetryTransition<typeof Name>(state, response.message, Number.MAX_SAFE_INTEGER, {
        deleteByQueryTaskId: state.deleteByQueryTaskId,
        mustRefresh: state.mustRefresh,
      });
    }
    if (response.type === 'completed') {
      return transitionTo(
        { ...state, mustRefresh: response.mustRefresh },
        PREPARE_COMPATIBLE_MIGRATION.Name,
        response.preTransform
      );
    }
    if (state.retryCount < state.retryAttempts) {
      const retryCount = state.retryCount + 1;
      return transitionTo(
        {
          ...state,
          retryCount,
          retryDelay: 1500 + 1000 * Math.random(),
          logs: [
            ...state.logs,
            {
              level: 'warning',
              message: `Errors occurred whilst deleting unwanted documents. Another instance is probably updating or deleting documents in the same index. Retrying attempt ${retryCount}.`,
            },
          ],
        },
        CLEANUP_UNKNOWN_AND_EXCLUDED.Name,
        { mustRefresh: true, deleteByQueryTaskId: state.deleteByQueryTaskId }
      );
    }
    return transitionTo(state, FATAL.Name, { reason: response.reason });
  },
});
