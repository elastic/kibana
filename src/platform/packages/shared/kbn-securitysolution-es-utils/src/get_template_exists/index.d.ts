import type { ElasticsearchClient } from '../elasticsearch_client';
export declare const getTemplateExists: (esClient: ElasticsearchClient, template: string) => Promise<boolean>;
