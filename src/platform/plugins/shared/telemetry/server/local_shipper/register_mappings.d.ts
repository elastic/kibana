import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
export declare function registerIndexMappings(getElasticsearchClient: () => Promise<ElasticsearchClient>, logger: Logger): Promise<void>;
