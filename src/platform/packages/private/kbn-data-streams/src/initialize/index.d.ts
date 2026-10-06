import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { AnyDataStreamDefinition } from '../types';
/**
 * https://www.elastic.co/docs/manage-data/data-store/data-streams/set-up-data-stream
 *
 * Endeavour to be idempotent and race-condition safe.
 */
export declare function initialize({ logger, dataStream, elasticsearchClient, lazyCreation, devMode, }: {
    logger: Logger;
    dataStream: AnyDataStreamDefinition;
    elasticsearchClient: ElasticsearchClient;
    lazyCreation?: boolean;
    /** When true, additional safety checks run that would be too expensive for production. */
    devMode?: boolean;
}): Promise<{
    dataStreamReady: boolean;
}>;
