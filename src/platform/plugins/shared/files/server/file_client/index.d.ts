export { EsIndexFilesMetadataClient, SavedObjectsFileMetadataClient } from './file_metadata_client';
export type { FileMetadataClient, DeleteMetedataArg, FileDescriptor, FindMetadataArg, GetMetadataArg, GetUsageMetricsArgs, UpdateMetadataArg, } from './file_metadata_client';
export { FileClientImpl } from './file_client';
export type { FileClient } from './types';
export { createEsFileClient } from './create_es_file_client';
export type { CreateEsFileClientArgs } from './create_es_file_client';
export { AlreadyDeletedError, ContentAlreadyUploadedError, NoDownloadAvailableError, UploadInProgressError, } from '../file/errors';
