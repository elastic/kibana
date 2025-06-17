/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as TaskEither from 'fp-ts/TaskEither';
import * as Option from 'fp-ts/Option';
import { flow } from 'fp-ts/function';
import {
  waitForTask,
  WaitForTaskCompletionTimeout,
  TaskCompletedWithRetriableError,
} from './wait_for_task';

import { RetryableEsClientError } from './catch_retryable_es_client_errors';

export const waitForPickupUpdatedMappingsTask = flow(
  waitForTask,
  TaskEither.chain(
    (
      res
    ): TaskEither.TaskEither<
      RetryableEsClientError | WaitForTaskCompletionTimeout | TaskCompletedWithRetriableError,
      'pickup_updated_mappings_succeeded'
    > => {
      // We don't catch or type failures/errors because they should never
      // occur in our migration algorithm and we don't have any business logic
      // for dealing with it. If something happens we'll just crash and try
      // again.
      if (Option.isSome(res.failures)) {
        throw new Error(
          'pickupUpdatedMappings task failed with the following failures:\n' +
            JSON.stringify(res.failures.value)
        );
      } else if (Option.isSome(res.error)) {
        if (res.error.value.type === 'search_phase_execution_exception') {
          // This error is normally fixed in the next try, so let's retry
          // the update mappings task instead of throwing
          return TaskEither.left({
            type: 'task_completed_with_retriable_error' as const,
            message: `The task being waited on encountered a ${res.error.value.type} error`,
          });
        }

        throw new Error(
          'pickupUpdatedMappings task failed with the following error:\n' +
            JSON.stringify(res.error.value)
        );
      } else {
        return TaskEither.right('pickup_updated_mappings_succeeded' as const);
      }
    }
  )
);
