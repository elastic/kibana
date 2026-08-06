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
    signal: z.any().optional(),
  })
);

export const ExecAsyncParamsSchema = lazySchema(() =>
  z.object({
    script: z.string().min(1).max(1048576),
    signal: z.any().optional(),
  })
);

export const GetExecStatusParamsSchema = lazySchema(() =>
  z.object({
    commandId: z.string().min(1).max(256),
    signal: z.any().optional(),
  })
);

export const DownloadFileParamsSchema = lazySchema(() =>
  z.object({
    remotePath: z.string().min(1).max(4096),
    signal: z.any().optional(),
  })
);

export const UploadFileParamsSchema = lazySchema(() =>
  z.object({
    remotePath: z.string().min(1).max(4096),
    content: z.string().min(1).max(104857600),
    encoding: z.literal('base64'),
    signal: z.any().optional(),
  })
);

export const ExecFileAsyncParamsSchema = lazySchema(() =>
  z.object({
    executable: z.string().min(1).max(4096),
    args: z.array(z.string().max(65536)).max(256).default([]),
    env: z.record(z.string(), z.unknown()).optional(),
    cwd: z.string().max(4096).optional(),
    outputFiles: z.array(z.string().max(4096)).max(256).optional(),
    signal: z.any().optional(),
  })
);

export const KillExecParamsSchema = lazySchema(() =>
  z.object({
    commandId: z.string().min(1).max(256),
    signal: z.any().optional(),
  })
);
