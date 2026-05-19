import * as TaskEither from 'fp-ts/TaskEither';
/** @internal */
export interface CleanupErrorResponse {
    type: 'cleanup_failed';
    failures: string[];
    versionConflicts?: number;
}
/** @internal */
export interface CleanupSuccessfulResponse {
    type: 'cleanup_successful';
    deleted?: number;
}
export declare const waitForDeleteByQueryTask: (a_0: import("./wait_for_task").WaitForTaskParams) => TaskEither.TaskEither<import("./catch_retryable_es_client_errors").RetryableEsClientError | import("./wait_for_task").WaitForTaskCompletionTimeout | CleanupErrorResponse, CleanupSuccessfulResponse>;
