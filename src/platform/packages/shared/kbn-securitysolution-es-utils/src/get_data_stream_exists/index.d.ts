import type { ElasticsearchClient } from '../elasticsearch_client';
/**
 * checks if data stream exists
 * @param esClient
 * @param name
 */
export declare const getDataStreamExists: (esClient: ElasticsearchClient, name: string) => Promise<boolean>;
