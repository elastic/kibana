import type { ElasticsearchClient } from '../elasticsearch_client';
/**
 * Retrieves the count of documents in a given index
 *
 * @param esClient An {@link ElasticsearchClient}
 * @param index index whose documents will be counted
 *
 * @returns the document count
 */
export declare const getIndexCount: ({ esClient, index, }: {
    esClient: ElasticsearchClient;
    index: string;
}) => Promise<number>;
