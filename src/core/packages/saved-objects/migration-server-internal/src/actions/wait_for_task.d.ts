import type { estypes } from '@elastic/elasticsearch';
import type * as TaskEither from 'fp-ts/TaskEither';
import * as Option from 'fp-ts/Option';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { type RetryableEsClientError } from './catch_retryable_es_client_errors';
/** @internal */
export interface WaitForTaskResponseError {
    type: string;
    reason?: string | null;
    index?: string;
    caused_by?: WaitForTaskResponseError;
}
/** @internal */
export interface WaitForTaskResponse {
    error: Option.Option<WaitForTaskResponseError>;
    completed: boolean;
    failures: Option.Option<any[]>;
    description?: string;
    response?: estypes.TasksGetResponse['response'];
}
/**
 * After waiting for the specified timeout, the task has not yet completed.
 *
 * When querying the tasks API we use `wait_for_completion=true` to block the
 * request until the task completes. If after the `timeout`, the task still has
 * not completed we return this error. This does not mean that the task itelf
 * has reached a timeout, Elasticsearch will continue to run the task.
 */
export interface WaitForTaskCompletionTimeout {
    /** After waiting for the specified timeout, the task has not yet completed. */
    readonly type: 'wait_for_task_completion_timeout';
    readonly message: string;
    readonly error?: Error;
}
/**
 * When we use `wait_for_completion=false`, we won't get the errors right away, we'll get a
 * task id. Then we have to query the tasks API with that id and Elasticsearch will tell us
 * if there was any error in the original task inside a 200 response. In some cases we might
 * want to retry the original task.
 */
export interface TaskCompletedWithRetriableError {
    /** While waiting, the original task encountered an error. It might need to be retried. */
    readonly type: 'task_completed_with_retriable_error';
    readonly message: string;
    readonly error?: Error;
}
/** @internal */
export interface WaitForTaskParams {
    client: ElasticsearchClient;
    taskId: string;
    timeout: string;
}
/**
 * Blocks for up to 60s or until a task completes.
 *
 * TODO: delete completed tasks
 */
export declare const waitForTask: ({ client, taskId, timeout, }: WaitForTaskParams) => TaskEither.TaskEither<RetryableEsClientError | WaitForTaskCompletionTimeout, WaitForTaskResponse>;
