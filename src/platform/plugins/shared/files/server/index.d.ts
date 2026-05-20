import type { PluginInitializerContext } from '@kbn/core/server';
export type { FileClient, FileDescriptor, GetMetadataArg, FindMetadataArg, UpdateMetadataArg, DeleteMetedataArg, FileMetadataClient, GetUsageMetricsArgs, CreateEsFileClientArgs, } from './file_client';
export { createEsFileClient } from './file_client';
export { createFileHashTransform } from './file_client/stream_transforms/file_hash_transform';
export type { FilesServerSetup as FilesSetup, FilesServerStart as FilesStart } from './types';
export type { FileShareServiceStart, CreateShareArgs, DeleteShareArgs, DeleteSharesForFileArgs, GetShareArgs, ListSharesArgs, UpdateShareArgs, } from './file_share_service';
export type { GetByIdArgs, FindFileArgs, CreateFileArgs, DeleteFileArgs, UpdateFileArgs, FileServiceStart, } from './file_service';
export type { FileServiceFactory } from './file_service/file_service_factory';
export declare function plugin(initializerContext: PluginInitializerContext): Promise<import("./plugin").FilesPlugin>;
