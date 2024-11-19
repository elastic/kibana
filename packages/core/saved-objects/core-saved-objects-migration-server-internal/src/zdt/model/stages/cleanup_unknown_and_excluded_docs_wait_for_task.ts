/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/lib/Either';
import { delayRetryState } from '../../../model/retry_state';
import { isTypeof } from '../../actions';
import type { ModelStage } from '../types';

export const cleanupUnknownAndExcludedDocsWaitForTask: ModelStage<
  'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK',
  | 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH'
  | 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS'
  | 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT'
  | 'FATAL'
> = (state, res, context) => {
  if (Either.isLeft(res)) {
    if (isTypeof(res.left, 'wait_for_task_completion_timeout')) {
      // After waiting for the specified timeout, the task has not yet
      // completed. Retry this step to see if the task has completed after an
      // exponential delay.  We will basically keep polling forever until the
      // Elasticsearch task succeeds or fails.
      return delayRetryState(state, res.left.message, Number.MAX_SAFE_INTEGER);
    } else {
      if (state.retryCount < context.maxRetryAttempts) {
        const retryCount = state.retryCount + 1;
        const retryDelay = 1500 + 1000 * Math.random();
        return {
          ...state,
          controlState: 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS',
          hasDeletedDocs: true,
          retryCount,
          retryDelay,
          logs: [
            ...state.logs,
            {
              level: 'warning',
              message: `Errors occurred whilst deleting unwanted documents. Retrying attempt ${retryCount}.`,
            },
          ],
        };
      } else {
        const failures = res.left.failures.length;
        const versionConflicts = res.left.versionConflicts ?? 0;
        let reason = `Migration failed because it was unable to delete unwanted documents from the ${state.currentIndex} system index (${failures} failures and ${versionConflicts} conflicts)`;
        if (failures) {
          reason += `:\n` + res.left.failures.map((failure: string) => `- ${failure}\n`).join('');
        }
        return {
          ...state,
          controlState: 'FATAL',
          reason,
        };
      }
    }
  }

  const mustRefresh =
    state.hasDeletedDocs || typeof res.right.deleted === 'undefined' || res.right.deleted > 0;

  if (mustRefresh) {
    return {
      ...state,
      controlState: 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH',
    };
  } else {
    return {
      ...state,
      controlState: 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT',
    };
  }
};
