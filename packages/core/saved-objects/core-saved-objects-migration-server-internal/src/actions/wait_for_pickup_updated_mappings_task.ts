/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as TaskEither from 'fp-ts/lib/TaskEither';
import * as Option from 'fp-ts/lib/Option';
import { flow } from 'fp-ts/lib/function';
import { waitForTask, WaitForTaskCompletionTimeout } from './wait_for_task';
import { RetryableEsClientError } from './catch_retryable_es_client_errors';

export const waitForPickupUpdatedMappingsTask = flow(
  waitForTask,
  TaskEither.chain(
    (
      res
    ): TaskEither.TaskEither<
      RetryableEsClientError | WaitForTaskCompletionTimeout,
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
