/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

const MAX_SLUG_LENGTH = 200;
const MAX_QUERY_LENGTH = 2000;
const MAX_ID_LENGTH = 64;
const MAX_CURSOR_LENGTH = 1024;
const MAX_COMMENT_LENGTH = 4000;

export const SentryListIssuesInputSchema = z.object({
  project: z
    .string()
    .max(MAX_SLUG_LENGTH)
    .optional()
    .describe(
      'Project slug to scope the search to. Omit to search across all projects in the organization.'
    ),
  query: z
    .string()
    .max(MAX_QUERY_LENGTH)
    .optional()
    .describe(
      'Sentry search query, e.g. "is:unresolved" or "is:unresolved level:error". Defaults to "is:unresolved" when omitted.'
    ),
  statsPeriod: z
    .string()
    .max(16)
    .optional()
    .describe(
      'Time window for issue stats, e.g. "24h", "14d". Defaults to Sentry\'s default (14d).'
    ),
  environment: z
    .string()
    .max(MAX_SLUG_LENGTH)
    .optional()
    .describe('Filter to a single environment, e.g. "production".'),
  sort: z
    .enum(['date', 'new', 'priority', 'freq', 'user'])
    .optional()
    .describe(
      'Sort order: date (last seen), new (first seen), priority, freq (event count), user (user count).'
    ),
  cursor: z
    .string()
    .max(MAX_CURSOR_LENGTH)
    .optional()
    .describe(
      'Pagination cursor from a previous listIssues response (nextCursor). Omit for the first page.'
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum number of issues to return per page (1-100). Defaults to 25.'),
});
export type SentryListIssuesInput = z.infer<typeof SentryListIssuesInputSchema>;

export const SentryGetIssueInputSchema = z.object({
  issueId: z
    .string()
    .min(1)
    .max(MAX_ID_LENGTH)
    .describe('The Sentry issue ID, returned by listIssues.'),
});
export type SentryGetIssueInput = z.infer<typeof SentryGetIssueInputSchema>;

export const SentryResolveIssueInputSchema = z.object({
  issueId: z.string().min(1).max(MAX_ID_LENGTH).describe('The Sentry issue ID to resolve.'),
  inNextRelease: z
    .boolean()
    .optional()
    .describe(
      'Resolve "in the next release" instead of immediately. Defaults to false (resolve now).'
    ),
});
export type SentryResolveIssueInput = z.infer<typeof SentryResolveIssueInputSchema>;

export const SentryIgnoreIssueInputSchema = z.object({
  issueId: z
    .string()
    .min(1)
    .max(MAX_ID_LENGTH)
    .describe('The Sentry issue ID to ignore (archive).'),
  ignoreDuration: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Minutes to ignore the issue for before it resurfaces. Omit to ignore indefinitely.'),
});
export type SentryIgnoreIssueInput = z.infer<typeof SentryIgnoreIssueInputSchema>;

export const SentryUnresolveIssueInputSchema = z.object({
  issueId: z
    .string()
    .min(1)
    .max(MAX_ID_LENGTH)
    .describe('The Sentry issue ID to move back to unresolved.'),
});
export type SentryUnresolveIssueInput = z.infer<typeof SentryUnresolveIssueInputSchema>;

export const SentryAssignIssueInputSchema = z.object({
  issueId: z.string().min(1).max(MAX_ID_LENGTH).describe('The Sentry issue ID to assign.'),
  assignedTo: z
    .string()
    .min(1)
    .max(320)
    .describe(
      'Who to assign the issue to: a user email/username, or "team:<team-slug>" to assign to a team. Use "me" to self-assign.'
    ),
});
export type SentryAssignIssueInput = z.infer<typeof SentryAssignIssueInputSchema>;

export const SentryDeleteIssueInputSchema = z.object({
  issueId: z
    .string()
    .min(1)
    .max(MAX_ID_LENGTH)
    .describe('The Sentry issue ID to permanently delete.'),
});
export type SentryDeleteIssueInput = z.infer<typeof SentryDeleteIssueInputSchema>;

export const SentryListIssueEventsInputSchema = z.object({
  issueId: z.string().min(1).max(MAX_ID_LENGTH).describe('The Sentry issue ID to list events for.'),
  cursor: z
    .string()
    .max(MAX_CURSOR_LENGTH)
    .optional()
    .describe(
      'Pagination cursor from a previous listIssueEvents response. Omit for the first page.'
    ),
  full: z
    .boolean()
    .optional()
    .describe(
      'Include full event payloads (stack traces, tags, context) instead of summaries. Defaults to false.'
    ),
});
export type SentryListIssueEventsInput = z.infer<typeof SentryListIssueEventsInputSchema>;

export const SentryGetEventInputSchema = z.object({
  project: z
    .string()
    .min(1)
    .max(MAX_SLUG_LENGTH)
    .describe('The project slug the event belongs to.'),
  eventId: z
    .string()
    .min(1)
    .max(MAX_ID_LENGTH)
    .describe('The Sentry event ID, returned by listIssueEvents.'),
});
export type SentryGetEventInput = z.infer<typeof SentryGetEventInputSchema>;

export const SentryBulkUpdateIssuesInputSchema = z.object({
  project: z
    .string()
    .min(1)
    .max(MAX_SLUG_LENGTH)
    .describe('The project slug the issues belong to.'),
  issueIds: z
    .array(z.string().max(MAX_ID_LENGTH))
    .min(1)
    .max(100)
    .describe('Issue IDs to update in one call (1-100).'),
  status: z
    .enum(['resolved', 'resolvedInNextRelease', 'unresolved', 'ignored'])
    .optional()
    .describe('New status to apply to all named issues.'),
  assignedTo: z
    .string()
    .max(320)
    .optional()
    .describe('Reassign all named issues to this user email/username or "team:<team-slug>".'),
});
export type SentryBulkUpdateIssuesInput = z.infer<typeof SentryBulkUpdateIssuesInputSchema>;

export const SentryListProjectsInputSchema = z.object({
  cursor: z
    .string()
    .max(MAX_CURSOR_LENGTH)
    .optional()
    .describe('Pagination cursor from a previous listProjects response. Omit for the first page.'),
});
export type SentryListProjectsInput = z.infer<typeof SentryListProjectsInputSchema>;

export const SentryListIssueAlertRulesInputSchema = z.object({
  project: z
    .string()
    .min(1)
    .max(MAX_SLUG_LENGTH)
    .describe('The project slug to list issue alert rules for.'),
  cursor: z
    .string()
    .max(MAX_CURSOR_LENGTH)
    .optional()
    .describe(
      'Pagination cursor from a previous listIssueAlertRules response. Omit for the first page.'
    ),
});
export type SentryListIssueAlertRulesInput = z.infer<typeof SentryListIssueAlertRulesInputSchema>;

export const SentryCreateIssueAlertRuleInputSchema = z.object({
  project: z
    .string()
    .min(1)
    .max(MAX_SLUG_LENGTH)
    .describe('The project slug to create the alert rule in.'),
  name: z.string().min(1).max(200).describe('Display name for the alert rule.'),
  actionMatch: z
    .enum(['all', 'any', 'none'])
    .default('all')
    .describe('Whether all, any, or none of the conditions must match to trigger the rule.'),
  conditions: z
    .array(z.record(z.string(), z.unknown()))
    .min(1)
    .describe(
      'Sentry condition objects, e.g. [{"id": "sentry.rules.conditions.first_seen_event.FirstSeenEventCondition"}]. See Sentry\'s issue alert rule docs for the full condition/action id catalog.'
    ),
  actions: z
    .array(z.record(z.string(), z.unknown()))
    .min(1)
    .describe(
      'Sentry action objects, e.g. [{"id": "sentry.rules.actions.notify_event.NotifyEventAction"}]. See Sentry\'s issue alert rule docs for the full condition/action id catalog.'
    ),
  frequency: z
    .number()
    .int()
    .min(5)
    .optional()
    .describe(
      'Minutes to wait before the rule can trigger again for the same issue. Defaults to 30.'
    ),
});
export type SentryCreateIssueAlertRuleInput = z.infer<typeof SentryCreateIssueAlertRuleInputSchema>;

export const SentryUpdateIssueAlertRuleInputSchema = z.object({
  project: z
    .string()
    .min(1)
    .max(MAX_SLUG_LENGTH)
    .describe('The project slug the alert rule belongs to.'),
  ruleId: z
    .string()
    .min(1)
    .max(MAX_ID_LENGTH)
    .describe('The alert rule ID, returned by listIssueAlertRules.'),
  name: z.string().max(200).optional().describe('New display name for the alert rule.'),
  actionMatch: z
    .enum(['all', 'any', 'none'])
    .optional()
    .describe('Whether all, any, or none of the conditions must match to trigger the rule.'),
  conditions: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe('Replacement set of Sentry condition objects. Omit to leave conditions unchanged.'),
  actions: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe('Replacement set of Sentry action objects. Omit to leave actions unchanged.'),
  frequency: z
    .number()
    .int()
    .min(5)
    .optional()
    .describe('Minutes to wait before the rule can trigger again for the same issue.'),
});
export type SentryUpdateIssueAlertRuleInput = z.infer<typeof SentryUpdateIssueAlertRuleInputSchema>;

export const SentryIssueCommentInputSchema = z.object({
  comment: z
    .string()
    .max(MAX_COMMENT_LENGTH)
    .optional()
    .describe('Optional activity comment to attach to the status change.'),
});

export interface SentryIssue {
  id: string;
  shortId?: string;
  title?: string;
  culprit?: string;
  status?: string;
  level?: string;
  count?: string;
  userCount?: number;
  firstSeen?: string;
  lastSeen?: string;
  permalink?: string;
  assignedTo?: { name?: string; email?: string; type?: string } | null;
  project?: { id?: string; name?: string; slug?: string };
  metadata?: Record<string, unknown>;
}

export interface SentryEvent {
  id: string;
  eventID?: string;
  message?: string;
  title?: string;
  dateCreated?: string;
  tags?: Array<{ key: string; value: string }>;
  entries?: unknown[];
  contexts?: Record<string, unknown>;
}

export interface SentryProject {
  id: string;
  slug: string;
  name: string;
  platform?: string;
  status?: string;
}

export interface SentryAlertRule {
  id: string;
  name: string;
  actionMatch?: string;
  conditions?: unknown[];
  actions?: unknown[];
  frequency?: number;
}
