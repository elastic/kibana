import { FilesPlugin } from './plugin';
export type { FilesPublicSetup as FilesSetup, FilesPublicStart as FilesStart } from './plugin';
export type { FilesClient, ScopedFilesClient, FilesClientFactory, FilesClientResponses, } from './types';
export declare function plugin(): FilesPlugin;
