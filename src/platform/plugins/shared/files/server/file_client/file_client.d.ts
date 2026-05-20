import type { Readable } from 'stream';
import { type Logger } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/security-plugin/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { File, FileJSON, FileKind, FileShareJSONWithToken, UpdatableFileMetadata } from '../../common/types';
import type { FileMetadataClient } from './file_metadata_client';
import type { BlobStorageClient, UploadOptions as BlobUploadOptions } from '../blob_storage_service';
import type { FileShareServiceStart, InternalFileShareService } from '../file_share_service';
import type { FileClient, CreateArgs, DeleteArgs, P1, ShareArgs } from './types';
import type { SupportedFileHashAlgorithm } from '../saved_objects/file';
export type UploadOptions = Omit<BlobUploadOptions, 'id'>;
export declare function createFileClient({ fileKindDescriptor, auditLogger, blobStorageClient, internalFileShareService, logger, metadataClient, }: {
    fileKindDescriptor: FileKind;
    metadataClient: FileMetadataClient;
    blobStorageClient: BlobStorageClient;
    internalFileShareService: undefined | InternalFileShareService;
    auditLogger: undefined | AuditLogger;
    logger: Logger;
}): FileClientImpl;
export declare class FileClientImpl implements FileClient {
    private fileKindDescriptor;
    private readonly metadataClient;
    private readonly blobStorageClient;
    private readonly internalFileShareService;
    private readonly logger;
    /**
     * A usage counter instance that is shared across all FileClient instances.
     */
    private static usageCounter;
    static configureUsageCounter(uc: UsageCounter): void;
    private readonly logAuditEvent;
    constructor(fileKindDescriptor: FileKind, metadataClient: FileMetadataClient, blobStorageClient: BlobStorageClient, internalFileShareService: undefined | InternalFileShareService, auditLogger: undefined | AuditLogger, logger: Logger);
    private getCounters;
    private incrementUsageCounter;
    private instantiateFile;
    get fileKind(): string;
    create<M = unknown>({ id, metadata }: CreateArgs): Promise<File<M>>;
    get<M = unknown>(arg: P1<FileMetadataClient['get']>): Promise<File<M>>;
    internalUpdate(id: string, metadata: Partial<FileJSON>): Promise<void>;
    update<M = unknown>(id: string, metadata: UpdatableFileMetadata<M>): Promise<void>;
    find<M = unknown>(arg: P1<FileMetadataClient['find']>): Promise<{
        files: File[];
        total: number;
    }>;
    delete({ id, hasContent }: DeleteArgs): Promise<void>;
    deleteContent: BlobStorageClient['delete'];
    /**
     * Upload a blob
     * @param file - The file Record that the content is associated with
     * @param rs - The readable stream of the file content
     * @param options - Options for the upload
     */
    upload: (file: FileJSON, rs: Readable, options?: UploadOptions) => Promise<UploadResult>;
    download: BlobStorageClient['download'];
    share({ file, name, validUntil }: ShareArgs): Promise<FileShareJSONWithToken>;
    unshare: FileShareServiceStart['delete'];
    listShares: FileShareServiceStart['list'];
}
export interface UploadResult {
    id: string;
    size: number;
    hashes: Array<{
        algorithm: SupportedFileHashAlgorithm;
        value: string;
    }>;
}
