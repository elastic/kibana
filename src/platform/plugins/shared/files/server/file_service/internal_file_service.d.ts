import type { Logger } from '@kbn/core/server';
import type { AuditEvent, AuditLogger } from '@kbn/security-plugin/server';
import type { BlobStorageService } from '../blob_storage_service';
import type { InternalFileShareService } from '../file_share_service';
import type { File as IFile, FileKind, FileJSON, FilesMetrics } from '../../common';
import type { FileKindsRegistry } from '../../common/file_kinds_registry';
import type { FileMetadataClient } from '../file_client';
import type { CreateFileArgs, UpdateFileArgs, DeleteFileArgs, BulkDeleteFilesArgs, FindFileArgs, GetByIdArgs, BulkGetByIdArgs } from './file_action_types';
/**
 * Service containing methods for working with files.
 *
 * All file business logic is encapsulated in the {@link File} class.
 *
 * @internal
 */
export declare class InternalFileService {
    private readonly metadataClient;
    private readonly blobStorageService;
    private readonly fileShareService;
    private readonly auditLogger;
    private readonly fileKindRegistry;
    private readonly logger;
    constructor(metadataClient: FileMetadataClient, blobStorageService: BlobStorageService, fileShareService: InternalFileShareService, auditLogger: undefined | AuditLogger, fileKindRegistry: FileKindsRegistry, logger: Logger);
    createFile(args: CreateFileArgs): Promise<IFile>;
    writeAuditLog(event: AuditEvent): void;
    updateFile({ attributes, id }: UpdateFileArgs): Promise<IFile>;
    deleteFile({ id }: DeleteFileArgs): Promise<void>;
    bulkDeleteFiles({ ids, }: BulkDeleteFilesArgs): Promise<Array<PromiseSettledResult<void>>>;
    private get;
    private bulkGet;
    getById({ id }: GetByIdArgs): Promise<IFile>;
    bulkGetById<M>(args: Pick<BulkGetByIdArgs, 'ids'> & {
        throwIfNotFound?: true;
    }): Promise<Array<IFile<M>>>;
    bulkGetById<M>(args: Pick<BulkGetByIdArgs, 'ids'> & {
        throwIfNotFound?: true;
        format: 'map';
    }): Promise<{
        [id: string]: IFile<M>;
    }>;
    bulkGetById<M>(args: Pick<BulkGetByIdArgs, 'ids'> & {
        throwIfNotFound: false;
    }): Promise<Array<IFile<M> | null>>;
    bulkGetById<M>(args: Pick<BulkGetByIdArgs, 'ids'> & {
        throwIfNotFound: false;
        format: 'map';
    }): Promise<{
        [id: string]: IFile<M> | null;
    }>;
    getFileKind(id: string): FileKind;
    findFilesJSON(args: FindFileArgs): Promise<{
        files: FileJSON[];
        total: number;
    }>;
    getUsageMetrics(): Promise<FilesMetrics>;
    getByToken(token: string): Promise<IFile<unknown>>;
    private toFile;
    private createFileClient;
}
