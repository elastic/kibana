import type { ElasticsearchClient } from '../elasticsearch_client';
/**
 * deletes data stream
 * @param esClient
 * @param name
 */
export declare const deleteDataStream: (esClient: ElasticsearchClient, name: string) => Promise<boolean>;
