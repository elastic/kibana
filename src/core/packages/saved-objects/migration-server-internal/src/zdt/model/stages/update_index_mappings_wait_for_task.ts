/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {} from 'lodash';
import * as Either from 'fp-ts/lib/Either';
import { delayRetryState } from '../../../model/retry_state';
import { throwBadResponse } from '../../../model/helpers';
import { isTypeof } from '../../actions';
import type { ModelStage } from '../types';

export const updateIndexMappingsWaitForTask: ModelStage<
  'UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK',
  'UPDATE_MAPPING_MODEL_VERSIONS' | 'UPDATE_INDEX_MAPPINGS' | 'FATAL'
> = (state, res, context) => {
  if (Either.isLeft(res)) {
    const left = res.left;
    if (isTypeof(left, 'wait_for_task_completion_timeout')) {
      // After waiting for the specified timeout, the task has not yet
      // completed. Retry this step to see if the task has completed after an
      // exponential delay.  We will basically keep polling forever until the
      // Elasticsearch task succeeds or fails.
      return delayRetryState(state, left.message, Number.MAX_SAFE_INTEGER);
    } else if (isTypeof(left, 'wait_for_task_completed_with_error_retry_original')) {
      if (state.retryCount < context.maxRetryAttempts) {
        const retryCount = state.retryCount + 1;
        const retryDelay = 1500 + 1000 * Math.random();
        return {
          ...state,
          controlState: 'UPDATE_INDEX_MAPPINGS',
          retryCount,
          retryDelay,
          skipRetryReset: true,
          logs: [
            ...state.logs,
            {
              level: 'warning',
              message: `Errors occurred while trying to update index mappings. Retrying attempt ${retryCount}.`,
            },
          ],
        };
      } else {
        const reason = `Migration was retried ${state.retryCount} times but failed with: ${left.message}.`;
        return {
          ...state,
          controlState: 'FATAL',
          reason,
        };
      }
    } else {
      throwBadResponse(state, left);
    }
  }

  return {
    ...state,
    controlState: 'UPDATE_MAPPING_MODEL_VERSIONS',
  };
};
