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

import { z } from '@kbn/zod/v4';

// Jira connector parameter schemas for different sub-actions
export const JiraPushToServiceParamsSchema = z.object({
  incident: z.object({
    summary: z.string(),
    description: z.string().optional(),
    issueType: z.string(),
    priority: z.string().optional(),
    labels: z.array(z.string()).optional(),
    otherFields: z.record(z.string(), z.any()).optional(),
  }),
  comments: z
    .array(
      z.object({
        comment: z.string(),
        commentId: z.string(),
      })
    )
    .optional(),
});

export const JiraGetIncidentParamsSchema = z.object({
  id: z.string(),
});

export const JiraGetFieldsParamsSchema = z.object({
  // Common fields parameters - usually empty object
});

export const JiraGetIssueTypesParamsSchema = z.object({
  // Issue types parameters - usually empty object
});

export const JiraGetFieldsByIssueTypeParamsSchema = z.object({
  id: z.string(), // Issue type ID
});

export const JiraGetIssuesParamsSchema = z.object({
  title: z.string(),
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

export const JiraPushToServiceResponseSchema = z.object({
  id: z.string(),
  key: z.string(),
  title: z.string(),
  url: z.string(),
});

export const JiraFieldsResponseSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    schema: z.object({
      type: z.string(),
      system: z.string().optional(),
    }),
    required: z.boolean(),
  })
);

export const JiraIssueTypesResponseSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    iconUrl: z.string().optional(),
    subtask: z.boolean(),
  })
);

export const JiraIssuesResponseSchema = z.array(
  z.object({
    id: z.string(),
    key: z.string(),
    summary: z.string(),
    status: z.string(),
    created: z.string(),
    updated: z.string(),
  })
);
