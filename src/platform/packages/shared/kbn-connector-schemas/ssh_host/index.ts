/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { CONNECTOR_ID, CONNECTOR_NAME, AUTH_TYPE, SUB_ACTION } from './constants';
export type { AuthType } from './constants';

export {
  ConfigSchema,
  SecretsSchema,
  ExecParamsSchema,
  ExecAsyncParamsSchema,
  GetExecStatusParamsSchema,
  DownloadFileParamsSchema,
  UploadFileParamsSchema,
  ExecFileAsyncParamsSchema,
  KillExecParamsSchema,
} from './schemas/latest';

export type {
  Config,
  Secrets,
  ExecParams,
  ExecAsyncParams,
  GetExecStatusParams,
  DownloadFileParams,
  UploadFileParams,
  ExecFileAsyncParams,
  KillExecParams,
} from './types/latest';
