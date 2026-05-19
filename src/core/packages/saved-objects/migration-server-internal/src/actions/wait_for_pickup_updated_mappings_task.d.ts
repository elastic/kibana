import * as TaskEither from 'fp-ts/TaskEither';
import type { WaitForTaskCompletionTimeout, TaskCompletedWithRetriableError } from './wait_for_task';
import type { RetryableEsClientError } from './catch_retryable_es_client_errors';
export declare const waitForPickupUpdatedMappingsTask: (a_0: import("./wait_for_task").WaitForTaskParams) => TaskEither.TaskEither<RetryableEsClientError | WaitForTaskCompletionTimeout | TaskCompletedWithRetriableError, "pickup_updated_mappings_succeeded">;
