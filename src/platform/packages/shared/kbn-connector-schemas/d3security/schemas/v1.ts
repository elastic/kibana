/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { D3SecuritySeverity } from '../constants';

// Connector schema
export const D3SecurityConfigSchema = z
  .object({
    url: z.string(),
  })
  .strict();

export const D3SecuritySecretsSchema = z.object({ token: z.string() }).strict();

// Run action schema
export const D3SecurityRunActionParamsSchema = z
  .object({
    body: z.string().optional(),
    severity: z.string().default(D3SecuritySeverity.EMPTY).optional(),
    eventType: z.string().default('').optional(),
  })
  .strict();

export const D3SecurityRunActionResponseSchema = z.object({
  refid: z.string(),
});
