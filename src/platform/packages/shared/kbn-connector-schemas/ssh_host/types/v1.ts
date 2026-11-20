/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import type {
  ConfigSchema,
  SecretsSchema,
  ExecParamsSchema,
  DownloadFileParamsSchema,
  UploadFileParamsSchema,
} from '../schemas/v1';

export type Config = z.infer<typeof ConfigSchema>;
export type Secrets = z.infer<typeof SecretsSchema>;
export type ExecParams = z.infer<typeof ExecParamsSchema>;
export type DownloadFileParams = z.infer<typeof DownloadFileParamsSchema>;
export type UploadFileParams = z.infer<typeof UploadFileParamsSchema>;
