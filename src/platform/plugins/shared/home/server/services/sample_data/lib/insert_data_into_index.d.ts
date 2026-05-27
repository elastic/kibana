import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { DataIndexSchema } from './sample_dataset_registry_types';
export declare const insertDataIntoIndex: ({ dataIndexConfig, logger, esClient, index, nowReference, }: {
    dataIndexConfig: DataIndexSchema;
    index: string;
    nowReference: string;
    esClient: IScopedClusterClient;
    logger: Logger;
}) => Promise<number>;
