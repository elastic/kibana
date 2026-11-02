/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

const ISSUE_STATUSES = ['active', 'resolved', 'archived', 'suppressed', 'pending_release'] as const;

export const PostHogListIssuesInputSchema = lazySchema(() =>
  z.object({
    status: z
      .enum([...ISSUE_STATUSES, 'all'] as const)
      .optional()
      .default('active')
      .describe(
        'Filter issues by status. Defaults to "active". Use "all" to include every status.'
      ),
    assigneeId: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Filter by assignee ID. Requires assigneeType. For type "user" this is the numeric ' +
          'PostHog user ID (e.g. "304865"), not the user\'s UUID; for type "role" it\'s the role UUID.'
      ),
    assigneeType: z
      .enum(['user', 'role'])
      .optional()
      .describe('Whether assigneeId refers to a user or a role.'),
    dateFrom: z
      .string()
      .max(40)
      .optional()
      .describe(
        'Only include issues last seen at or after this time. ISO 8601 or a relative offset like "-7d".'
      ),
    dateTo: z
      .string()
      .max(40)
      .optional()
      .describe(
        'Only include issues last seen at or before this time. ISO 8601 or a relative offset.'
      ),
    searchQuery: z
      .string()
      .max(500)
      .optional()
      .describe('Free-text search across issue name, description, and exception message.'),
    orderBy: z
      .enum(['last_seen', 'first_seen', 'occurrences', 'users', 'sessions'])
      .optional()
      .describe('Field to sort results by. Defaults to last_seen.'),
    orderDirection: z
      .enum(['ASC', 'DESC'])
      .optional()
      .describe('Sort direction. Defaults to DESC.'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(20)
      .describe('Maximum number of issues to return (1-100). Defaults to 20.'),
    offset: z.number().int().min(0).optional().describe('Pagination offset.'),
  })
);
export type PostHogListIssuesInput = z.infer<typeof PostHogListIssuesInputSchema>;

export const PostHogGetIssueInputSchema = lazySchema(() =>
  z.object({
    issueId: z.string().max(200).describe('UUID of the error-tracking issue to retrieve.'),
  })
);
export type PostHogGetIssueInput = z.infer<typeof PostHogGetIssueInputSchema>;

export const PostHogUpdateIssueStatusInputSchema = lazySchema(() =>
  z.object({
    issueId: z.string().max(200).describe('UUID of the error-tracking issue to update.'),
    status: z
      .enum(ISSUE_STATUSES)
      .describe(
        'Target status. "active" for issues needing attention, "resolved" once fixed, "suppressed" for noisy/unhelpful issues, "archived" to hide it, "pending_release" while awaiting a fix release.'
      ),
  })
);
export type PostHogUpdateIssueStatusInput = z.infer<typeof PostHogUpdateIssueStatusInputSchema>;

export const PostHogAssignIssueInputSchema = lazySchema(() =>
  z.object({
    issueId: z.string().max(200).describe('UUID of the error-tracking issue to assign.'),
    assigneeId: z
      .string()
      .max(200)
      .describe(
        'ID of the user or role to assign the issue to. For type "user" this is the numeric ' +
          'PostHog user ID (e.g. "304865"), not the user\'s UUID; for type "role" it\'s the role UUID.'
      ),
    assigneeType: z
      .enum(['user', 'role'])
      .default('user')
      .describe('Whether assigneeId refers to a user or a role.'),
  })
);
export type PostHogAssignIssueInput = z.infer<typeof PostHogAssignIssueInputSchema>;

export const PostHogRunQueryInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .max(8000)
      .describe(
        'The HogQL (SQL-like) query string to run, e.g. "select event, count() from events where event = \'$exception\' group by event".'
      ),
    name: z
      .string()
      .max(200)
      .optional()
      .describe('Descriptive name for the query, useful for identifying it later in query logs.'),
  })
);
export type PostHogRunQueryInput = z.infer<typeof PostHogRunQueryInputSchema>;

export const PostHogUpdateFeatureFlagInputSchema = lazySchema(() =>
  z.object({
    flagId: z.number().int().describe('Numeric ID of the feature flag to update.'),
    active: z.boolean().optional().describe('Enable (true) or disable (false) the flag entirely.'),
    rolloutPercentage: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .describe(
        "Set the rollout percentage (0-100). Applied to each of the flag's existing release-condition groups, preserving their targeting properties; if the flag has no groups, a single group matching all users is created with this percentage."
      ),
  })
);
export type PostHogUpdateFeatureFlagInput = z.infer<typeof PostHogUpdateFeatureFlagInputSchema>;

export const PostHogGetFeatureFlagInputSchema = lazySchema(() =>
  z.object({
    flagId: z.number().int().describe('Numeric ID of the feature flag to retrieve.'),
  })
);
export type PostHogGetFeatureFlagInput = z.infer<typeof PostHogGetFeatureFlagInputSchema>;

export const PostHogListFeatureFlagsInputSchema = lazySchema(() =>
  z.object({
    search: z
      .string()
      .max(200)
      .optional()
      .describe('Filter flags by a substring of their name or key.'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(50)
      .describe('Maximum number of flags to return (1-100). Defaults to 50.'),
  })
);
export type PostHogListFeatureFlagsInput = z.infer<typeof PostHogListFeatureFlagsInputSchema>;

export const PostHogCreateAnnotationInputSchema = lazySchema(() =>
  z.object({
    content: z
      .string()
      .max(8192)
      .describe('Annotation text shown on charts, e.g. "Deployed v1.2.3 to production".'),
    dateMarker: z
      .string()
      .max(40)
      .describe(
        'ISO 8601 timestamp of when the marked event happened, used to position it on charts.'
      ),
    scope: z
      .enum(['dashboard_item', 'dashboard', 'project', 'organization', 'recording'])
      .optional()
      .default('project')
      .describe('Where the annotation is shown. Defaults to project (all project charts).'),
  })
);
export type PostHogCreateAnnotationInput = z.infer<typeof PostHogCreateAnnotationInputSchema>;

export const PostHogListSessionRecordingsInputSchema = lazySchema(() =>
  z.object({
    dateFrom: z
      .string()
      .max(40)
      .optional()
      .describe(
        'Earliest start time of recordings to include. ISO 8601 or a relative offset like "-7d".'
      ),
    dateTo: z
      .string()
      .max(40)
      .optional()
      .describe('Latest start time of recordings to include. ISO 8601 or a relative offset.'),
    personId: z
      .string()
      .max(200)
      .optional()
      .describe('Restrict results to recordings for this person ID.'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(20)
      .describe('Maximum number of recordings to return (1-100). Defaults to 20.'),
  })
);
export type PostHogListSessionRecordingsInput = z.infer<
  typeof PostHogListSessionRecordingsInputSchema
>;

export const PostHogCreateExternalReferenceInputSchema = lazySchema(() =>
  z.object({
    issueId: z.string().max(200).describe('UUID of the error-tracking issue to link.'),
    integrationId: z
      .number()
      .int()
      .describe('ID of the configured external integration (e.g. GitHub or Jira) to link through.'),
    externalUrl: z
      .string()
      .url()
      .max(2000)
      .optional()
      .describe('URL of the external ticket, e.g. a GitHub issue or Jira ticket link.'),
    config: z
      .record(z.string().max(200), z.unknown())
      .optional()
      .describe(
        'Additional integration-specific configuration for the reference (e.g. repository or ticket key).'
      ),
  })
);
export type PostHogCreateExternalReferenceInput = z.infer<
  typeof PostHogCreateExternalReferenceInputSchema
>;
