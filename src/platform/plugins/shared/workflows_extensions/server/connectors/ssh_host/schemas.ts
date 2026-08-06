/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

export const SshHostConfigSchema = z
  .object({
    host: z.string().min(1),
  })
  .strict();

export const SshHostSecretsSchema = z
  .object({
    username: z.string().min(1),
    password: z.string().optional(),
    sshPrivateKey: z.string().min(1),
  })
  .strict();

export const SshHostExecParamsSchema = z.object({
  script: z.string().min(1),
  signal: z.any().optional(),
});

export const SshHostExecAsyncParamsSchema = z.object({
  script: z.string().min(1),
  signal: z.any().optional(),
});

export const SshHostGetExecStatusParamsSchema = z.object({
  commandId: z.string().min(1),
  signal: z.any().optional(),
});

export const SshHostDownloadFileParamsSchema = z.object({
  remotePath: z.string().min(1),
  signal: z.any().optional(),
});

export const SshHostUploadFileParamsSchema = z.object({
  remotePath: z.string().min(1),
  content: z.string().min(1),
  encoding: z.literal('base64'),
  signal: z.any().optional(),
});

export const SshHostExecFileAsyncParamsSchema = z.object({
  executable: z.string().min(1),
  args: z.array(z.string()).default([]),
  env: z.record(z.string(), z.unknown()).optional(),
  cwd: z.string().optional(),
  outputFiles: z.array(z.string()).optional(),
  signal: z.any().optional(),
});

export const SshHostKillExecParamsSchema = z.object({
  commandId: z.string().min(1),
  signal: z.any().optional(),
});

export type SshHostConfig = z.infer<typeof SshHostConfigSchema>;
export type SshHostSecrets = z.infer<typeof SshHostSecretsSchema>;
export type SshHostExecParams = z.infer<typeof SshHostExecParamsSchema>;
export type SshHostDownloadFileParams = z.infer<typeof SshHostDownloadFileParamsSchema>;
export type SshHostUploadFileParams = z.infer<typeof SshHostUploadFileParamsSchema>;
export type SshHostExecAsyncParams = z.infer<typeof SshHostExecAsyncParamsSchema>;
export type SshHostGetExecStatusParams = z.infer<typeof SshHostGetExecStatusParamsSchema>;
export type SshHostExecFileAsyncParams = z.infer<typeof SshHostExecFileAsyncParamsSchema>;
export type SshHostKillExecParams = z.infer<typeof SshHostKillExecParamsSchema>;
