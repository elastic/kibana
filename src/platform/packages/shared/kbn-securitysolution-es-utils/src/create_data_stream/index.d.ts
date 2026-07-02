import type { ElasticsearchClient } from '../elasticsearch_client';
/**
 * creates data stream
 * @param esClient
 * @param name
 */
export declare const createDataStream: (esClient: ElasticsearchClient, name: string) => Promise<unknown>;
