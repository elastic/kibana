/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import { delayRetryState } from '../../../model/retry_state';
import { isTypeof } from '../../actions';
import type { ModelStage } from '../types';

export const cleanupUnknownAndExcludedDocsWaitForTask: ModelStage<
  'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK',
  'REFRESH_INDEX_AFTER_CLEANUP' | 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS' | 'FATAL'
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
          retryCount,
          retryDelay,
          logs: [
            ...state.logs,
            {
              level: 'warning',
              message: `Errors occurred whilst deleting unwanted documents. Another instance is probably updating or deleting documents in the same index. Retrying attempt ${retryCount}.`,
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

  return {
    ...state,
    controlState: 'REFRESH_INDEX_AFTER_CLEANUP',
  };
};
