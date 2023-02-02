/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { FileServiceFactoryImpl as FileServiceFactory } from './file_service_factory';
export type {
  CreateFileArgs,
  DeleteFileArgs,
  FindFileArgs,
  GetByIdArgs,
  UpdateFileArgs,
} from './file_action_types';
export type { FileServiceStart } from './file_service';
export * as errors from './errors';
