import type { Client } from '@elastic/elasticsearch';
/**
 * Client used to query the elasticsearch cluster.
 *
 * @public
 */
export type ElasticsearchClient = Omit<Client, 'connectionPool' | 'serializer' | 'extend' | 'close' | 'diagnostic'>;
/**
 * Options for configuring per-request logging.
 *
 * @public
 */
export interface ElasticsearchRequestLoggingOptions {
    /**
     * The logger name to use for logging requests. It results in the logger name `elasticsearch.query.<loggerName>`.
     * This allows grouping logs by the logger name, and using different configurations for each logger.
     */
    loggerName: string;
}
