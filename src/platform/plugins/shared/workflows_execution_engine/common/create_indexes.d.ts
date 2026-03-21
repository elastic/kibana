import type { ElasticsearchClient, Logger } from '@kbn/core/server';
interface CreateIndexesOptions {
    esClient: ElasticsearchClient;
    logger?: Logger;
}
export declare function createIndexes(options: CreateIndexesOptions): Promise<void>;
export {};
