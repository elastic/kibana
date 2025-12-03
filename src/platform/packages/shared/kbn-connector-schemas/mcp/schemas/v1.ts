/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

export const ConfigSchema = z
  .object({
    serverUrl: z.string(),
    tools: z.array(
      // TODO: determine if we want to store all tools or just the enabled ones
      z.object({
        name: z.string(),
        enabled: z.boolean(),
      })
    ),
  })
  .strict();

export const SecretsSchema = z
  .object({
    headers: z.string().optional(), // JSON string (will likely change)
  })
  .strict();
