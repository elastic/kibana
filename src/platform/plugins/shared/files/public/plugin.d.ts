import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { FilesClientFactory, FilesPublicSetupDependencies, FilesPublicStartDependencies } from './types';
import type { FileKindBrowser } from '../common';
/**
 * Public setup-phase contract
 */
export interface FilesPublicSetup {
    /**
     * A factory for creating an {@link FilesClient} instance. This requires a
     * registered {@link FileKindBrowser}.
     *
     * @track-adoption
     */
    filesClientFactory: FilesClientFactory;
    /**
     * Register a {@link FileKind} which allows for specifying details about the files
     * that will be uploaded.
     *
     * @param {FileKind} fileKind - the file kind to register
     */
    registerFileKind(fileKind: FileKindBrowser): void;
}
export type FilesPublicStart = Pick<FilesPublicSetup, 'filesClientFactory'> & {
    getFileKindDefinition: (id: string) => FileKindBrowser;
    getAllFindKindDefinitions: () => FileKindBrowser[];
};
/**
 * Bringing files to Kibana
 */
export declare class FilesPlugin implements Plugin<FilesPublicSetup, FilesPublicStart, FilesPublicSetupDependencies, FilesPublicStartDependencies> {
    private registry;
    private filesClientFactory?;
    setup(core: CoreSetup): FilesPublicSetup;
    start(core: CoreStart): FilesPublicStart;
}
