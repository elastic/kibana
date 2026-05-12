/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

export const BEFORE_COMPLETION_TRIGGER_ID = 'inference.beforeCompletion' as const;
export const AFTER_COMPLETION_TRIGGER_ID = 'inference.afterCompletion' as const;

const messageSchema = z.object({ role: z.string(), content: z.string().optional() }).passthrough();

export const beforeCompletionEventSchema = z
  .object({
    sessionId: z.string().describe('Session/conversation identifier for cross-turn determinism'),
    system: z.string().optional().describe('System prompt, if any'),
    messages: z.array(messageSchema).describe('Chat messages to be sent to the LLM'),
  })
  .passthrough();

export const afterCompletionEventSchema = z
  .object({
    sessionId: z.string().describe('Session/conversation identifier'),
    response: z.string().describe('LLM response text'),
  })
  .passthrough();
