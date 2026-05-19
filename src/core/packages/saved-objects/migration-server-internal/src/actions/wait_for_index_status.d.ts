import type * as TaskEither from 'fp-ts/TaskEither';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { type RetryableEsClientError } from './catch_retryable_es_client_errors';
/** @internal */
export interface WaitForIndexStatusParams {
    client: ElasticsearchClient;
    index: string;
    timeout?: string;
    status: 'yellow' | 'green';
}
export interface IndexNotYellowTimeout {
    type: 'index_not_yellow_timeout';
    message: string;
}
export interface IndexNotGreenTimeout {
    type: 'index_not_green_timeout';
    message: string;
}
export declare function waitForIndexStatus({ client, index, timeout, status, }: WaitForIndexStatusParams & {
    status: 'yellow';
}): TaskEither.TaskEither<RetryableEsClientError | IndexNotYellowTimeout, {}>;
export declare function waitForIndexStatus({ client, index, timeout, status, }: WaitForIndexStatusParams & {
    status: 'green';
}): TaskEither.TaskEither<RetryableEsClientError | IndexNotGreenTimeout, {}>;
