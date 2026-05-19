import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type api from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/logging';
export declare const getExistingIndexTemplate: (elasticsearchClient: ElasticsearchClient, dataStreamName: string, logger: Logger) => Promise<api.IndicesGetIndexTemplateIndexTemplateItem | undefined>;
export declare const getExistingDataStream: (elasticsearchClient: ElasticsearchClient, dataStreamName: string, logger: Logger) => Promise<api.IndicesDataStream | undefined>;
