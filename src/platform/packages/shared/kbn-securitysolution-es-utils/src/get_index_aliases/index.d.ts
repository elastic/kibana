import type { ElasticsearchClient } from '../elasticsearch_client';
interface IndexAlias {
    alias: string;
    index: string;
    isWriteIndex: boolean;
}
/**
 * Retrieves all index aliases for a given alias name
 *
 * @param esClient An {@link ElasticsearchClient}
 * @param alias alias name used to filter results
 * @param index index name used to filter results
 *
 * @returns an array of {@link IndexAlias} objects
 */
export declare const getIndexAliases: ({ esClient, alias, index, }: {
    esClient: ElasticsearchClient;
    alias: string;
    index?: string;
}) => Promise<IndexAlias[]>;
export {};
