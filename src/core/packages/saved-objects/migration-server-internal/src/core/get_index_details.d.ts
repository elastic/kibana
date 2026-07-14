import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
export interface IndexDetails {
    mappings: MappingTypeMapping;
    aliases: string[];
}
export declare const getIndexDetails: (client: ElasticsearchClient, index: string, retryDelay?: number) => Promise<IndexDetails>;
export declare const extractVersionFromKibanaIndexAliases: (aliases: string[]) => string | undefined;
