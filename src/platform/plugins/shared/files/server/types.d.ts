import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { FileKind } from '../common';
import type { FileServiceFactory } from './file_service/file_service_factory';
/**
 * Files plugin setup contract
 */
export interface FilesServerSetup {
    /**
     * Register a {@link FileKind} which allows for specifying details about the files
     * that will be uploaded.
     *
     * @param {FileKind} fileKind - the file kind to register
     *
     * @track-adoption
     */
    registerFileKind(fileKind: FileKind): void;
}
/**
 * Files plugin start contract
 */
export interface FilesServerStart {
    /**
     * Create an instance of {@link FileServiceStart}.
     *
     * @track-adoption
     */
    fileServiceFactory: FileServiceFactory;
}
export interface FilesServerSetupDependencies {
    security?: SecurityPluginSetup;
    usageCollection?: UsageCollectionSetup;
}
export interface FilesServerStartDependencies {
    security?: SecurityPluginStart;
}
