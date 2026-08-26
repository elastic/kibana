/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z, lazySchema } from '@kbn/zod/v4';

export const ConfigSchema = lazySchema(() => z.object({}).strict().default({}));

const secretsSchemaProps = {
  webhookUrl: z.string(),
};
export const SecretsSchema = lazySchema(() => z.object(secretsSchemaProps).strict());

export const ParamsSchema = lazySchema(() =>
  z
    .object({
      message: z.string().min(1),
    })
    .strict()
);
