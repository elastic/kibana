import type { SavedObjectsServiceSetup, SavedObjectsServiceStart, Logger, KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { BlobStorageService } from '../blob_storage_service';
import type { FileServiceStart } from './file_service';
import type { FileKindsRegistry } from '../../common/file_kinds_registry';
/**
 * A simple interface for getting an instance of {@link FileServiceStart}
 */
export interface FileServiceFactory {
    /**
     * Get a file service instance that is scoped to the current user request.
     *
     * @param req - the Kibana request to scope the service to
     */
    asScoped(req: KibanaRequest): FileServiceStart;
    /**
     * Get a file service instance that is scoped to the internal user.
     *
     * @note
     * Do not use this to drive interactions with files that are initiated by a
     * user.
     */
    asInternal(): FileServiceStart;
}
/**
 * Factory for creating {@link FileServiceStart} instances.
 */
export declare class FileServiceFactoryImpl implements FileServiceFactory {
    private readonly savedObjectsService;
    private readonly blobStorageService;
    private readonly security;
    private readonly fileKindRegistry;
    private readonly logger;
    constructor(savedObjectsService: SavedObjectsServiceStart, blobStorageService: BlobStorageService, security: undefined | SecurityPluginSetup, fileKindRegistry: FileKindsRegistry, logger: Logger);
    private createFileService;
    asScoped(req: KibanaRequest): FileServiceStart;
    asInternal(): FileServiceStart;
    /**
     * This function can only called during Kibana's setup phase
     */
    static setup(savedObjectsSetup: SavedObjectsServiceSetup, usageCounter?: UsageCounter): void;
}
