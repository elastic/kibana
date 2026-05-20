import type { HttpStart } from '@kbn/core/public';
import type { FileKindBrowser } from '@kbn/shared-ux-file-types';
import type { ScopedFilesClient, FilesClient } from '../types';
import type { FileKindsRegistryImpl } from '../../common/file_kinds_registry';
/**
 * @internal
 */
export declare const apiRoutes: {
    /**
     * Scoped to file kind
     */
    getCreateFileRoute: (fileKind: string) => string;
    getUploadRoute: (fileKind: string, id: string) => string;
    getDownloadRoute: (fileKind: string, id: string, fileName?: string) => string;
    getUpdateRoute: (fileKind: string, id: string) => string;
    getDeleteRoute: (fileKind: string, id: string) => string;
    getListRoute: (fileKind: string) => string;
    getByIdRoute: (fileKind: string, id: string) => string;
    /**
     * Scope to file shares and file kind
     */
    getShareRoute: (fileKind: string, id: string) => string;
    getListSharesRoute: (fileKind: string) => string;
    /**
     * Public routes
     */
    getPublicDownloadRoute: (fileName?: string) => string;
    /**
     * Top-level routes
     */
    getFindRoute: () => string;
    getMetricsRoute: () => string;
    getBulkDeleteRoute: () => string;
};
/**
 * Arguments to create a new {@link FileClient}.
 */
export interface Args {
    /**
     * Registry of file kinds.
     */
    registry: FileKindsRegistryImpl<FileKindBrowser>;
    /**
     * The http start service from core.
     */
    http: HttpStart;
}
/**
 * Arguments to create a new {@link ScopedFilesClient}.
 */
export interface ScopedArgs extends Args {
    /**
     * The file kind to scope all requests to where file kinds are needed.
     */
    fileKind: string;
}
export declare function createFilesClient(args: Args): FilesClient;
export declare function createFilesClient(scopedArgs: ScopedArgs): ScopedFilesClient;
