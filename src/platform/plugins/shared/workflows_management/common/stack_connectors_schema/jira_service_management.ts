/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/jira-service-management/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */

import { z } from '@kbn/zod/v4';

// Jira Service Management connector parameter schemas for different sub-actions
export const JiraServiceManagementCreateAlertParamsSchema = z.object({
  message: z.string(),
  alias: z.string().optional(),
  description: z.string().optional(),
  responders: z
    .array(
      z.object({
        type: z.enum(['team', 'user', 'escalation', 'schedule']),
        name: z.string().optional(),
        id: z.string().optional(),
        username: z.string().optional(),
      })
    )
    .optional(),
  visibleTo: z
    .array(
      z.object({
        type: z.enum(['team', 'user']),
        name: z.string().optional(),
        id: z.string().optional(),
        username: z.string().optional(),
      })
    )
    .optional(),
  actions: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  details: z.record(z.string(), z.string()).optional(),
  entity: z.string().optional(),
  source: z.string().optional(),
  priority: z.enum(['P1', 'P2', 'P3', 'P4', 'P5']).optional(),
  user: z.string().optional(),
  note: z.string().optional(),
});

export const JiraServiceManagementCloseAlertParamsSchema = z.object({
  alias: z.string(),
  user: z.string().optional(),
  source: z.string().optional(),
  note: z.string().optional(),
});

// Jira Service Management connector response schema
export const JiraServiceManagementResponseSchema = z.object({
  result: z.string(),
  took: z.number(),
  requestId: z.string(),
});
