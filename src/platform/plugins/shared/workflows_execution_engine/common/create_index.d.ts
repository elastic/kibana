import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
interface CreateIndexOptions {
    esClient: ElasticsearchClient;
    indexName: string;
    mappings: MappingTypeMapping;
    logger?: Logger;
}
export declare const createIndexWithMappings: ({ esClient, indexName, mappings, logger, }: CreateIndexOptions) => Promise<void>;
export declare const createOrUpdateIndex: ({ esClient, indexName, mappings, logger, }: CreateIndexOptions) => Promise<void>;
export {};
