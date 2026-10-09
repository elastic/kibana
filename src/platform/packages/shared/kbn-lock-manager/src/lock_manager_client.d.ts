import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
export type LockId = string;
export interface LockDocument {
    createdAt: string;
    expiresAt: string;
    metadata: Record<string, any>;
    token: string;
}
export interface AcquireOptions {
    /**
     * Metadata to be stored with the lock. This can be any key-value pair.
     * This is not mapped and therefore not searchable.
     */
    metadata?: Record<string, any>;
    /**
     * Time to live (TTL) for the lock in milliseconds. Default is 30 seconds.
     * When a lock expires it can be acquired by another process
     */
    ttl?: number;
}
export declare const runSetupIndexAssetOnce: (esClient: ElasticsearchClient, logger: Logger) => Promise<void>;
export declare function rerunSetupIndexAsset(): void;
export declare class LockManager {
    private lockId;
    private esClient;
    private logger;
    private token;
    constructor(lockId: LockId, esClient: ElasticsearchClient, logger: Logger);
    /**
     * Attempts to acquire a lock by creating a document with the given lockId.
     * If the lock exists and is expired, it will be released and acquisition retried.
     */
    acquire({ metadata, ttl, }?: AcquireOptions): Promise<boolean>;
    /**
     * Releases the lock by deleting the document with the given lockId and token
     */
    release(): Promise<boolean>;
    /**
     * Retrieves the lock document for a given lockId.
     * If the lock is expired, it will not be returned
     */
    get(): Promise<LockDocument | undefined>;
    extendTtl(ttl: number): Promise<boolean>;
}
export declare function getLock({ esClient, logger, lockId, }: {
    esClient: ElasticsearchClient;
    logger: Logger;
    lockId: LockId;
}): Promise<LockDocument | undefined>;
export declare function isLockAcquisitionError(error: unknown): error is LockAcquisitionError;
export declare function withLock<T>({ esClient, logger, lockId, metadata, ttl, }: {
    esClient: ElasticsearchClient;
    logger: Logger;
    lockId: LockId;
} & AcquireOptions, callback: () => Promise<T>): Promise<T>;
export declare class LockAcquisitionError extends Error {
    constructor(message: string);
}
