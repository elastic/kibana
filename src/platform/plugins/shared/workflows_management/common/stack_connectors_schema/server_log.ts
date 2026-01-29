/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/server_log/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */

import { z } from '@kbn/zod/v4';

// Server Log connector parameter schema
export const ServerLogParamsSchema = z.object({
  message: z.string(),
  level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).optional(),
});

// Server Log connector response schema
export const ServerLogResponseSchema = z.object({
  actionId: z.string(),
});
