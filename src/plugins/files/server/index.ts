/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PluginInitializerContext } from '@kbn/core/server';
import { FilesPlugin } from './plugin';

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

export type { FilesSetup, FilesStart } from './types';
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

export function plugin(initializerContext: PluginInitializerContext) {
  return new FilesPlugin(initializerContext);
}
