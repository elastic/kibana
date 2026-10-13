/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v 1".
 */

import type * as TaskEither from 'fp-ts/TaskEither';
import type { RetryableEsClientError } from '../../actions/catch_retryable_es_client_errors';
import { waitForPickupUpdatedMappingsTask } from '../../actions/wait_for_pickup_updated_mappings_task';
import {
  catchTaskNotFound,
  type TaskCompletedWithRetriableError,
  type TaskNotFound,
  type WaitForTaskCompletionTimeout,
  type WaitForTaskParams,
} from '../../actions/wait_for_task';

/** Waits for the mapping pickup task and reports a lost task so the step can be rerun. */
export const waitForUpdateIndexMappingsTask =
  (
    params: WaitForTaskParams
  ): TaskEither.TaskEither<
    | RetryableEsClientError
    | WaitForTaskCompletionTimeout
    | TaskCompletedWithRetriableError
    | TaskNotFound,
    'pickup_updated_mappings_succeeded'
  > =>
  () =>
    waitForPickupUpdatedMappingsTask(params)().catch(catchTaskNotFound);
