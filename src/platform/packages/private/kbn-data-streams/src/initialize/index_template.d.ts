import type api from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { AnyDataStreamDefinition } from '../types';
/**
 * https://www.elastic.co/docs/manage-data/data-store/data-streams/set-up-data-stream
 *
 * Endeavour to be idempotent and race-condition safe.
 */
export declare function initializeIndexTemplate({ logger, dataStream, elasticsearchClient, existingIndexTemplate, skipCreation, }: {
    logger: Logger;
    dataStream: AnyDataStreamDefinition;
    elasticsearchClient: ElasticsearchClient;
    existingIndexTemplate: api.IndicesGetIndexTemplateIndexTemplateItem | undefined;
    skipCreation?: boolean;
}): Promise<{
    uptoDate: boolean;
}>;
