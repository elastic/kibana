/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext } from '@kbn/core/server';

export type {
  FileClient,
  FileDescriptor,
  GetMetadataArg,
  FindMetadataArg,
  UpdateMetadataArg,
  DeleteMetedataArg,
  FileMetadataClient,
  GetUsageMetricsArgs,
  CreateEsFileClientArgs,
} from './file_client';
export { createEsFileClient } from './file_client';

export { createFileHashTransform } from './file_client/stream_transforms/file_hash_transform';

export type { FilesServerSetup as FilesSetup, FilesServerStart as FilesStart } from './types';
export type {
  FileShareServiceStart,
  CreateShareArgs,
  DeleteShareArgs,
  DeleteSharesForFileArgs,
  GetShareArgs,
  ListSharesArgs,
  UpdateShareArgs,
} from './file_share_service';
export type {
  GetByIdArgs,
  FindFileArgs,
  CreateFileArgs,
  DeleteFileArgs,
  UpdateFileArgs,
  FileServiceStart,
} from './file_service';
export type { FileServiceFactory } from './file_service/file_service_factory';

export async function plugin(initializerContext: PluginInitializerContext) {
  const { FilesPlugin } = await import('./plugin');
  return new FilesPlugin(initializerContext);
}
