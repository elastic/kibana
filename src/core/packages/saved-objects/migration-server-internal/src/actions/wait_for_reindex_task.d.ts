import * as TaskEither from 'fp-ts/TaskEither';
import type { RetryableEsClientError } from './catch_retryable_es_client_errors';
import type { IndexNotFound, TargetIndexHadWriteBlock } from '.';
import { type WaitForTaskCompletionTimeout } from './wait_for_task';
export interface IncompatibleMappingException {
    type: 'incompatible_mapping_exception';
}
export declare const waitForReindexTask: (a_0: import("./wait_for_task").WaitForTaskParams) => TaskEither.TaskEither<RetryableEsClientError | IndexNotFound | WaitForTaskCompletionTimeout | IncompatibleMappingException | TargetIndexHadWriteBlock, "reindex_succeeded">;
