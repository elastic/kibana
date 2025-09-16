/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/jira/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */

import { z } from '@kbn/zod';

// Jira connector parameter schemas for different sub-actions
export const JiraCreateIssueParamsSchema = z.object({
  incident: z.object({
    summary: z.string(),
    description: z.string().optional(),
    issueType: z.string(),
    priority: z.string().optional(),
    labels: z.array(z.string()).optional(),
    otherFields: z.record(z.string(), z.any()).optional(),
  }),
});

export const JiraUpdateIssueParamsSchema = z.object({
  incident: z.object({
    summary: z.string().optional(),
    description: z.string().optional(),
    issueType: z.string().optional(),
    priority: z.string().optional(),
    labels: z.array(z.string()).optional(),
    otherFields: z.record(z.string(), z.any()).optional(),
  }),
  incidentId: z.string(),
});

export const JiraGetIssueParamsSchema = z.object({
  id: z.string(),
});

// Jira connector response schemas
export const JiraIssueResponseSchema = z.object({
  id: z.string(),
  key: z.string(),
  title: z.string(),
  summary: z.string(),
  description: z.string().optional(),
  created: z.string(),
  updated: z.string(),
  status: z.string(),
  priority: z.string().optional(),
  labels: z.array(z.string()).optional(),
});

export const JiraCreateIssueResponseSchema = z.object({
  id: z.string(),
  key: z.string(),
  title: z.string(),
  url: z.string(),
});
