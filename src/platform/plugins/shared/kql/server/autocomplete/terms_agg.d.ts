import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import type { ConfigSchema } from '../config';
export declare function termsAggSuggestions(config: ConfigSchema, savedObjectsClient: SavedObjectsClientContract, esClient: ElasticsearchClient, index: string, fieldName: string, query: string, filters?: estypes.QueryDslQueryContainer[], field?: FieldSpec, abortSignal?: AbortSignal): Promise<any[]>;
