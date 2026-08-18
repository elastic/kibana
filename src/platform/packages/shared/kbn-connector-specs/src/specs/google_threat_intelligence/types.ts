/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

const FILE_HASH_RE = /^([a-fA-F0-9]{64}|[a-fA-F0-9]{40}|[a-fA-F0-9]{32})$/;

export const FILE_HASH_SCHEMA = z
  .string()
  .regex(FILE_HASH_RE, {
    message:
      'Must be a SHA-256 (64 hex chars), SHA-1 (40 hex chars), or MD5 (32 hex chars) file hash',
  })
  .describe(
    'SHA-256, SHA-1, or MD5 hash identifying the file, e.g. a 64-character SHA-256 hex string'
  );

export const GetFileBehavioursInputSchema = lazySchema(() =>
  z.object({
    fileHash: FILE_HASH_SCHEMA,
    limit: z
      .number()
      .int()
      .min(0)
      .max(40)
      .optional()
      .describe(
        'Maximum number of behaviour reports to retrieve. Minimum 0, maximum 40. Defaults to 10 if omitted.'
      ),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe(
        'Continuation cursor from a previous response, used to retrieve the next page of results.'
      ),
  })
);
export type GetFileBehavioursInput = z.infer<typeof GetFileBehavioursInputSchema>;

export const GetFileMitreAttackTechniquesInputSchema = lazySchema(() =>
  z.object({
    fileHash: FILE_HASH_SCHEMA,
  })
);
export type GetFileMitreAttackTechniquesInput = z.infer<
  typeof GetFileMitreAttackTechniquesInputSchema
>;
