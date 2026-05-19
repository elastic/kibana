import type { Logger } from '@kbn/core/server';
import type { Readable } from 'stream';
import type { Observable } from 'rxjs';
import type { UploadOptions } from '../blob_storage_service';
import type { FileShareJSON, FileShareJSONWithToken } from '../../common/types';
import type { File as IFile, UpdatableFileMetadata, FileJSON } from '../../common';
import type { FileClientImpl } from '../file_client/file_client';
/**
 * Scopes file actions to an ID and set of attributes.
 *
 * Also exposes the upload and download functionality.
 */
export declare class File<M = unknown> implements IFile {
    readonly id: string;
    private metadata;
    private readonly fileClient;
    private readonly logger;
    constructor(id: string, metadata: FileJSON<M>, fileClient: FileClientImpl, logger: Logger);
    private updateFileState;
    private isReady;
    private isDeleted;
    private uploadInProgress;
    update(attrs: Partial<UpdatableFileMetadata>): Promise<IFile<M>>;
    private upload;
    uploadContent(content: Readable, abort$?: Observable<unknown>, options?: Partial<Pick<UploadOptions, 'transforms'>>): Promise<IFile<M>>;
    downloadContent(): Promise<Readable>;
    delete(): Promise<void>;
    share({ name, validUntil, }: {
        name: string;
        validUntil?: number;
    }): Promise<FileShareJSONWithToken>;
    listShares(): Promise<FileShareJSON[]>;
    unshare(opts: {
        shareId: string;
    }): Promise<void>;
    toJSON(): FileJSON<M>;
    get data(): FileJSON<M>;
    private set data(value);
}
