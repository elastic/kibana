import type { ElasticsearchClientConfig } from '@kbn/core-elasticsearch-server';
export declare const mergeConfig: (baseConfig: ElasticsearchClientConfig, configOverrides: Partial<ElasticsearchClientConfig>) => ElasticsearchClientConfig;
