import type { ElasticsearchClient, Logger } from '@kbn/core/server';
export declare function ensureWorkflowsDataStreamsRolledOver(logger: Logger, esClient: ElasticsearchClient): Promise<void>;
