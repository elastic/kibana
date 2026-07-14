import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { AnyDataStreamDefinition } from '../types';
/**
 * https://www.elastic.co/docs/manage-data/data-store/data-streams/set-up-data-stream
 *
 * Endeavour to be idempotent and race-condition safe.
 */
export declare function initialize({ logger, dataStream, elasticsearchClient, lazyCreation, }: {
    logger: Logger;
    dataStream: AnyDataStreamDefinition;
    elasticsearchClient: ElasticsearchClient;
    lazyCreation?: boolean;
}): Promise<{
    dataStreamReady: boolean;
}>;
