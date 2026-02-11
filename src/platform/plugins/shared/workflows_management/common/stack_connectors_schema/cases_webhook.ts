/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/cases_webhook/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */

import { z } from '@kbn/zod/v4';

// Cases Webhook connector parameter schemas for different sub-actions
export const CasesWebhookCreateCaseParamsSchema = z.object({
  incident: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()).optional(),
    severity: z.string().optional(),
    urgency: z.string().optional(),
    impact: z.string().optional(),
  }),
});

export const CasesWebhookUpdateCaseParamsSchema = z.object({
  incident: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    severity: z.string().optional(),
    urgency: z.string().optional(),
    impact: z.string().optional(),
  }),
  incidentId: z.string(),
});

export const CasesWebhookCreateCommentParamsSchema = z.object({
  incidentId: z.string(),
  comment: z.object({
    comment: z.string(),
    commentId: z.string(),
  }),
});

// Cases Webhook connector response schema
export const CasesWebhookResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  pushedDate: z.string(),
});
