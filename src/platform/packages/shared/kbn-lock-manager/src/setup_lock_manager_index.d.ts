import type { ElasticsearchClient, Logger } from '@kbn/core/server';
export declare const LOCKS_CONCRETE_INDEX_NAME = ".kibana_locks-000001";
export declare const LOCKS_COMPONENT_TEMPLATE_NAME = ".kibana_locks-component";
export declare const LOCKS_INDEX_TEMPLATE_NAME = ".kibana_locks-index-template";
export declare function removeLockIndexWithIncorrectMappings(esClient: ElasticsearchClient, logger: Logger): Promise<void>;
export declare function ensureTemplatesAndIndexCreated(esClient: ElasticsearchClient, logger: Logger): Promise<void>;
export declare function setupLockManagerIndex(esClient: ElasticsearchClient, logger: Logger): Promise<void>;
