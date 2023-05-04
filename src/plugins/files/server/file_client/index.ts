/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { EsIndexFilesMetadataClient, SavedObjectsFileMetadataClient } from './file_metadata_client';
export type {
  FileMetadataClient,
  DeleteMetedataArg,
  FileDescriptor,
  FindMetadataArg,
  GetMetadataArg,
  GetUsageMetricsArgs,
  UpdateMetadataArg,
} from './file_metadata_client';
export { FileClientImpl } from './file_client';
export type { FileClient } from './types';
export { createEsFileClient } from './create_es_file_client';
export type { CreateEsFileClientArgs } from './create_es_file_client';
export {
  AlreadyDeletedError,
  ContentAlreadyUploadedError,
  NoDownloadAvailableError,
  UploadInProgressError,
} from '../file/errors';
