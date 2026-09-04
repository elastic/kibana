/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

export const ConfigSchema = lazySchema(() =>
  z
    .object({
      host: z.string().min(1).max(253),
      authType: z.enum(['privateKey', 'password']).default('privateKey'),
    })
    .strict()
);

export const SecretsSchema = lazySchema(() =>
  z
    .object({
      username: z.string().min(1).max(256),
      sshPrivateKey: z.string().max(65536).nullable().default(null),
      password: z.string().max(1024).nullable().default(null),
    })
    .strict()
);

export const ExecParamsSchema = lazySchema(() =>
  z.object({
    script: z.string().min(1).max(1048576),
  })
);

export const DownloadFileParamsSchema = lazySchema(() =>
  z.object({
    remotePath: z.string().min(1).max(4096),
  })
);

export const UploadFileParamsSchema = lazySchema(() =>
  z.object({
    remotePath: z.string().min(1).max(4096),
    content: z.string().min(1).max(104857600),
    encoding: z.literal('base64'),
  })
);
