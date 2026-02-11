/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/slack/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */

import { z } from '@kbn/zod/v4';

// Slack connector parameter schema
export const SlackParamsSchema = z.object({
  message: z.string(),
  channel: z.string().optional(),
  username: z.string().optional(),
  icon_emoji: z.string().optional(),
  icon_url: z.string().optional(),
});

// Slack connector response schema
export const SlackResponseSchema = z.object({
  ok: z.boolean(),
  channel: z.string().optional(),
  ts: z.string().optional(),
  message: z
    .object({
      text: z.string(),
      username: z.string().optional(),
      bot_id: z.string().optional(),
      type: z.string().optional(),
      subtype: z.string().optional(),
      ts: z.string().optional(),
    })
    .optional(),
  error: z.string().optional(),
});
