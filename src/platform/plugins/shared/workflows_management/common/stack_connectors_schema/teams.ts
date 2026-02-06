/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/teams/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */

import { z } from '@kbn/zod/v4';

// Microsoft Teams connector parameter schema
export const TeamsParamsSchema = z.object({
  message: z.string(),
});

// Microsoft Teams connector response schema
export const TeamsResponseSchema = z.object({
  type: z.string(),
  id: z.string(),
  timestamp: z.string(),
  serviceUrl: z.string(),
  channelId: z.string(),
  from: z.object({
    id: z.string(),
    name: z.string().optional(),
  }),
  conversation: z.object({
    id: z.string(),
  }),
  recipient: z.object({
    id: z.string(),
    name: z.string().optional(),
  }),
  text: z.string(),
  replyToId: z.string().optional(),
});
