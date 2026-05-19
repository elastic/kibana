import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BlobStorageSettings } from '../../common';
import type { BlobStorageClient } from './types';
export declare class BlobStorageService {
    private readonly esClient;
    private readonly logger;
    /**
     * The number of uploads per Kibana instance that can be running simultaneously
     */
    private readonly concurrentUploadsToES;
    /**
     * The number of downloads per Kibana instance that can be running simultaneously
     */
    private readonly concurrentDownloadsFromES;
    constructor(esClient: ElasticsearchClient, logger: Logger);
    private createESBlobStorage;
    createBlobStorageClient(args?: BlobStorageSettings): BlobStorageClient;
    getStaticBlobStorageSettings(): {
        esFixedSizeIndex: {
            capacity: number;
        };
    };
}
