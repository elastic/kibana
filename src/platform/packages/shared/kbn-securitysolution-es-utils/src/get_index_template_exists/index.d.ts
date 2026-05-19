import type { ElasticsearchClient } from '../elasticsearch_client';
export declare const getIndexTemplateExists: (esClient: ElasticsearchClient, template: string) => Promise<boolean>;
