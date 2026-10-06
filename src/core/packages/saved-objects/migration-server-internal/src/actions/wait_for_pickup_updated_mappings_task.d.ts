/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as TaskEither from 'fp-ts/TaskEither';
import type {
  WaitForTaskCompletionTimeout,
  TaskCompletedWithRetriableError,
} from './wait_for_task';
import type { RetryableEsClientError } from './catch_retryable_es_client_errors';
export declare const waitForPickupUpdatedMappingsTask: (
  a_0: import('./wait_for_task').WaitForTaskParams
) => TaskEither.TaskEither<
  RetryableEsClientError | TaskCompletedWithRetriableError | WaitForTaskCompletionTimeout,
  'pickup_updated_mappings_succeeded'
>;
