import type { DiagnosticResult, Client } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchApiToRedactInLogs } from '@kbn/core-elasticsearch-server';
/**
 * The logger-relevant request meta of an ES request
 */
export interface RequestDebugMeta {
    /**
     * The requested method
     */
    method: string;
    /**
     * The requested endpoint + querystring
     */
    url: string;
    /**
     * The request body (it may be redacted)
     */
    body: string;
    /**
     * The status code of the response
     */
    statusCode: number | null;
}
/**
 * Returns a debug message from an Elasticsearch error in the following format:
 * [error type] error reason
 */
export declare function getErrorMessage(error: errors.ElasticsearchClientError): string;
/**
 * Returns stringified debug information from an Elasticsearch request event
 * useful for logging in case of an unexpected failure.
 */
export declare function getRequestDebugMeta(event: DiagnosticResult, apisToRedactInLogs?: ElasticsearchApiToRedactInLogs[]): RequestDebugMeta;
export declare const instrumentEsQueryAndDeprecationLogger: ({ logger, client, type, apisToRedactInLogs, }: {
    logger: Logger;
    client: Client;
    type: string;
    apisToRedactInLogs: ElasticsearchApiToRedactInLogs[];
}) => void;
