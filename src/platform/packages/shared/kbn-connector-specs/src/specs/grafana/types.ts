/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

const MAX_ID_LENGTH = 128;
const MAX_QUERY_LENGTH = 500;
const MAX_TEXT_LENGTH = 4000;

export const GrafanaMatcherSchema = z.object({
  name: z.string().min(1).max(200).describe('The label name to match on, e.g. "alertname".'),
  value: z.string().max(1000).describe('The label value (or regex pattern if isRegex is true).'),
  isRegex: z
    .boolean()
    .optional()
    .describe('Treat value as a regular expression. Defaults to false.'),
  isEqual: z
    .boolean()
    .optional()
    .describe(
      'Whether this is an equality match (true) or a negative match (false). Defaults to true.'
    ),
});

export const GrafanaGetAlertsInputSchema = z.object({
  active: z.boolean().optional().describe('Include active/firing alerts. Defaults to true.'),
  silenced: z.boolean().optional().describe('Include silenced alerts. Defaults to true.'),
  inhibited: z.boolean().optional().describe('Include inhibited alerts. Defaults to true.'),
});
export type GrafanaGetAlertsInput = z.infer<typeof GrafanaGetAlertsInputSchema>;

export const GrafanaListRulesInputSchema = z.object({});
export type GrafanaListRulesInput = z.infer<typeof GrafanaListRulesInputSchema>;

export const GrafanaGetAlertRuleInputSchema = z.object({
  uid: z.string().min(1).max(MAX_ID_LENGTH).describe('The alert rule UID, returned by listRules.'),
});
export type GrafanaGetAlertRuleInput = z.infer<typeof GrafanaGetAlertRuleInputSchema>;

export const GrafanaListSilencesInputSchema = z.object({});
export type GrafanaListSilencesInput = z.infer<typeof GrafanaListSilencesInputSchema>;

export const GrafanaGetSilenceInputSchema = z.object({
  silenceId: z
    .string()
    .min(1)
    .max(MAX_ID_LENGTH)
    .describe('The silence ID, returned by listSilences or createSilence.'),
});
export type GrafanaGetSilenceInput = z.infer<typeof GrafanaGetSilenceInputSchema>;

export const GrafanaCreateSilenceInputSchema = z.object({
  matchers: z
    .array(GrafanaMatcherSchema)
    .min(1)
    .max(100)
    .describe('Label matchers identifying which alerts this silence mutes.'),
  startsAt: z
    .string()
    .min(1)
    .max(64)
    .describe('RFC3339 timestamp the silence starts at, e.g. "2026-01-01T00:00:00Z".'),
  endsAt: z
    .string()
    .min(1)
    .max(64)
    .describe('RFC3339 timestamp the silence ends at, e.g. "2026-01-01T02:00:00Z".'),
  comment: z
    .string()
    .min(1)
    .max(MAX_TEXT_LENGTH)
    .describe('Reason for the silence, e.g. "Scheduled maintenance window".'),
  createdBy: z
    .string()
    .min(1)
    .max(320)
    .describe('Who/what created the silence, e.g. the workflow or user name.'),
});
export type GrafanaCreateSilenceInput = z.infer<typeof GrafanaCreateSilenceInputSchema>;

export const GrafanaDeleteSilenceInputSchema = z.object({
  silenceId: z.string().min(1).max(MAX_ID_LENGTH).describe('The silence ID to expire.'),
});
export type GrafanaDeleteSilenceInput = z.infer<typeof GrafanaDeleteSilenceInputSchema>;

export const GrafanaCreateAnnotationInputSchema = z.object({
  text: z
    .string()
    .min(1)
    .max(MAX_TEXT_LENGTH)
    .describe('The annotation text/body, e.g. "Deploy v1.2.3" or "Auto-remediation ran".'),
  dashboardUID: z
    .string()
    .max(MAX_ID_LENGTH)
    .optional()
    .describe(
      'Dashboard UID to attach the annotation to. Omit for an organization-wide annotation.'
    ),
  panelId: z
    .number()
    .int()
    .optional()
    .describe('Panel ID within the dashboard to attach the annotation to. Requires dashboardUID.'),
  time: z
    .number()
    .int()
    .optional()
    .describe('Epoch milliseconds for the annotation time. Defaults to now.'),
  timeEnd: z
    .number()
    .int()
    .optional()
    .describe(
      'Epoch milliseconds for the annotation end time, creating a region/range annotation instead of a point-in-time marker.'
    ),
  tags: z
    .array(z.string().max(100))
    .max(20)
    .optional()
    .describe('Tags to attach to the annotation, e.g. ["deploy", "incident-123"].'),
});
export type GrafanaCreateAnnotationInput = z.infer<typeof GrafanaCreateAnnotationInputSchema>;

export const GrafanaUpdateAnnotationInputSchema = z.object({
  annotationId: z
    .number()
    .int()
    .describe('The annotation ID to update, returned by createAnnotation.'),
  text: z.string().max(MAX_TEXT_LENGTH).optional().describe('New annotation text.'),
  tags: z.array(z.string().max(100)).max(20).optional().describe('Replacement tag list.'),
  time: z.number().int().optional().describe('New epoch-millisecond start time.'),
  timeEnd: z
    .number()
    .int()
    .optional()
    .describe('New epoch-millisecond end time, e.g. set this to mark an incident resolved.'),
});
export type GrafanaUpdateAnnotationInput = z.infer<typeof GrafanaUpdateAnnotationInputSchema>;

export const GrafanaDeleteAnnotationInputSchema = z.object({
  annotationId: z.number().int().describe('The annotation ID to delete.'),
});
export type GrafanaDeleteAnnotationInput = z.infer<typeof GrafanaDeleteAnnotationInputSchema>;

export const GrafanaSearchDashboardsInputSchema = z.object({
  query: z
    .string()
    .max(MAX_QUERY_LENGTH)
    .optional()
    .describe('Free-text search query matched against dashboard/folder titles.'),
  tag: z
    .array(z.string().max(100))
    .max(20)
    .optional()
    .describe('Filter to dashboards having all of these tags.'),
  type: z
    .enum(['dash-db', 'dash-folder'])
    .optional()
    .describe('Restrict results to dashboards (dash-db) or folders (dash-folder).'),
  starred: z.boolean().optional().describe('Only return starred dashboards.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(5000)
    .optional()
    .describe('Maximum results to return (1-5000). Defaults to 1000.'),
  page: z.number().int().min(1).optional().describe('1-indexed page number.'),
});
export type GrafanaSearchDashboardsInput = z.infer<typeof GrafanaSearchDashboardsInputSchema>;

export const GrafanaGetDashboardInputSchema = z.object({
  uid: z
    .string()
    .min(1)
    .max(MAX_ID_LENGTH)
    .describe('The dashboard UID, returned by searchDashboards.'),
});
export type GrafanaGetDashboardInput = z.infer<typeof GrafanaGetDashboardInputSchema>;

export const GrafanaListContactPointsInputSchema = z.object({
  name: z.string().max(200).optional().describe('Filter to a contact point with this exact name.'),
});
export type GrafanaListContactPointsInput = z.infer<typeof GrafanaListContactPointsInputSchema>;

export const GrafanaListMuteTimingsInputSchema = z.object({});
export type GrafanaListMuteTimingsInput = z.infer<typeof GrafanaListMuteTimingsInputSchema>;

export const GrafanaGetNotificationPolicyTreeInputSchema = z.object({});
export type GrafanaGetNotificationPolicyTreeInput = z.infer<
  typeof GrafanaGetNotificationPolicyTreeInputSchema
>;

export interface GrafanaAlertmanagerAlert {
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  state?: string;
  status?: { state?: string; silencedBy?: string[]; inhibitedBy?: string[]; mutedBy?: string[] };
  receivers?: Array<{ name?: string }>;
  fingerprint?: string;
  startsAt?: string;
  endsAt?: string;
  updatedAt?: string;
  generatorURL?: string;
}

export interface GrafanaAlertRule {
  id?: number;
  uid: string;
  orgID?: number;
  folderUID?: string;
  ruleGroup?: string;
  title?: string;
  condition?: string;
  data?: unknown[];
  for?: string;
  noDataState?: string;
  execErrState?: string;
  annotations?: Record<string, string>;
  labels?: Record<string, string>;
  isPaused?: boolean;
  notification_settings?: unknown;
}

export interface GrafanaSilence {
  id: string;
  status?: { state?: string };
  matchers?: Array<{ name: string; value: string; isRegex?: boolean; isEqual?: boolean }>;
  startsAt?: string;
  endsAt?: string;
  updatedAt?: string;
  createdBy?: string;
  comment?: string;
}

export interface GrafanaDashboardSearchHit {
  id?: number;
  uid?: string;
  title?: string;
  url?: string;
  type?: string;
  tags?: string[];
  isStarred?: boolean;
  folderUid?: string;
  folderTitle?: string;
}

export interface GrafanaContactPoint {
  uid: string;
  name: string;
  type?: string;
  settings?: Record<string, unknown>;
  disableResolveMessage?: boolean;
}
