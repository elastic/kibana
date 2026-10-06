import type * as TaskEither from 'fp-ts/TaskEither';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { type RetryableEsClientError } from './catch_retryable_es_client_errors';
/** @internal */
export interface ClosePitParams {
    client: ElasticsearchClient;
    pitId: string;
}
export declare const closePit: ({ client, pitId }: ClosePitParams) => TaskEither.TaskEither<RetryableEsClientError, {}>;
