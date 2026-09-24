/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z, lazySchema } from '@kbn/zod/v4';

const configSchemaProps = {
  webhookIntegrationUrl: z.string(),
};
export const ConfigSchema = lazySchema(() => z.object(configSchemaProps).strict());

const secretSchemaProps = {
  token: z.string(),
};
export const SecretsSchema = lazySchema(() => z.object(secretSchemaProps).strict());

export const ParamsSchema = lazySchema(() =>
  z
    .object({
      body: z.string(),
    })
    .strict()
);
