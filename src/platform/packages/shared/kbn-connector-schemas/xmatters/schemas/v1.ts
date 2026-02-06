/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z } from '@kbn/zod';

const configSchemaProps = {
  configUrl: z.string().nullable().default(null),
  usesBasic: z.boolean().default(true),
};
export const ConfigSchema = z.object(configSchemaProps).strict();

const secretSchemaProps = {
  user: z.string().nullable().default(null),
  password: z.string().nullable().default(null),
  secretsUrl: z.string().nullable().default(null),
};
export const SecretsSchema = z.object(secretSchemaProps).strict();

export const ParamsSchema = z
  .object({
    alertActionGroupName: z.string().optional(),
    signalId: z.string().optional(),
    ruleName: z.string().optional(),
    date: z.string().optional(),
    severity: z.string(),
    spaceId: z.string().optional(),
    tags: z.string().optional(),
  })
  .strict();
