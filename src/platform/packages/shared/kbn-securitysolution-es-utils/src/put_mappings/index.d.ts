import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '../elasticsearch_client';
/**
 * update mappings of index
 * @param esClient
 * @param index
 * @param mappings
 */
export declare const putMappings: (esClient: ElasticsearchClient, index: string, mappings: Record<string, MappingProperty>) => Promise<unknown>;
