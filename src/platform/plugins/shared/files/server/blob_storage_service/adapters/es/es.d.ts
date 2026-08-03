import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { Semaphore } from '@kbn/std';
import type { Readable, Transform } from 'stream';
import type { BlobStorageClient } from '../../types';
/**
 * Export this value for convenience to be used in tests. Do not use outside of
 * this adapter.
 * @internal
 */
export declare const BLOB_STORAGE_SYSTEM_INDEX_NAME = ".kibana_blob_storage";
export declare const MAX_BLOB_STORE_SIZE_BYTES: number;
interface UploadOptions {
    transforms?: Transform[];
    id?: string;
}
export declare class ElasticsearchBlobStorageClient implements BlobStorageClient {
    private readonly esClient;
    private readonly index;
    private readonly chunkSize;
    private readonly logger;
    /**
     * Override the default concurrent upload limit by passing in a different
     * semaphore
     */
    private readonly uploadSemaphore;
    /**
     * Override the default concurrent download limit by passing in a different
     * semaphore
     */
    private readonly downloadSemaphore;
    /** Indicates that the index provided is an alias (changes how content is retrieved internally) */
    private readonly indexIsAlias;
    private static defaultUploadSemaphore;
    private static defaultDownloadSemaphore;
    /**
     * Call this function once to globally set the concurrent transfer (upload/download) limit for
     * all {@link ElasticsearchBlobStorageClient} instances.
     */
    static configureConcurrentTransfers(capacity: number | [number, number]): void;
    constructor(esClient: ElasticsearchClient, index: string | undefined, chunkSize: undefined | string, logger: Logger, 
    /**
     * Override the default concurrent upload limit by passing in a different
     * semaphore
     */
    uploadSemaphore?: Semaphore, 
    /**
     * Override the default concurrent download limit by passing in a different
     * semaphore
     */
    downloadSemaphore?: Semaphore, 
    /** Indicates that the index provided is an alias (changes how content is retrieved internally) */
    indexIsAlias?: boolean);
    /**
     * This function acts as a singleton i.t.o. execution: it can only be called once per index.
     * Subsequent calls for the same index should not re-execute it.
     */
    protected static createIndexIfNotExists: ((index: string, esClient: ElasticsearchClient, logger: Logger, indexIsAlias: boolean) => Promise<void>) & import("lodash").MemoizedFunction;
    upload(src: Readable, options?: UploadOptions): Promise<{
        id: string;
        size: number;
    }>;
    private getReadableContentStream;
    download({ id, size }: {
        id: string;
        size?: number;
    }): Promise<Readable>;
    delete(id: string): Promise<void>;
}
export {};
