/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

const MAX_ID_LENGTH = 64;
const MAX_TITLE_LENGTH = 500;
const MAX_TEXT_LENGTH = 10000;

export interface JsonApiRelationshipRef {
  id: string;
  type: string;
}

export interface JsonApiResource {
  id: string;
  type?: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<
    string,
    { data?: JsonApiRelationshipRef | JsonApiRelationshipRef[] | null }
  >;
}

export interface JsonApiSingleResponse {
  data: JsonApiResource;
  included?: JsonApiResource[];
}

export interface JsonApiListResponse {
  data: JsonApiResource[];
  included?: JsonApiResource[];
  links?: { self?: string; first?: string; prev?: string; next?: string; last?: string };
  meta?: {
    current_page?: number;
    next_page?: number;
    prev_page?: number;
    total_count?: number;
    total_pages?: number;
    next_cursor?: string;
  };
}

export const RootlyCreateIncidentInputSchema = z.object({
  title: z.string().min(1).max(MAX_TITLE_LENGTH).describe('Incident title.'),
  summary: z.string().max(MAX_TEXT_LENGTH).optional().describe('Incident summary.'),
  severityId: z
    .string()
    .max(MAX_ID_LENGTH)
    .optional()
    .describe('Severity resource ID. Use listSeverities to resolve a real ID.'),
  serviceIds: z
    .array(z.string().max(MAX_ID_LENGTH))
    .optional()
    .describe('Affected service resource IDs.'),
  groupIds: z
    .array(z.string().max(MAX_ID_LENGTH))
    .optional()
    .describe('Owning team (group) resource IDs.'),
  status: z
    .enum(['started', 'detected', 'mitigated', 'resolved', 'cancelled', 'in_triage'])
    .optional()
    .describe(
      "Initial incident status. Defaults to Rootly's standard initial status when omitted."
    ),
  private: z.boolean().optional().describe('Whether the incident is private.'),
  labels: z
    .record(z.string().max(100), z.string().max(200))
    .optional()
    .describe(
      'Labels to attach to the incident, as a key-value map (e.g. {"platform": "osx", "version": "1.29"}).'
    ),
});
export type RootlyCreateIncidentInput = z.infer<typeof RootlyCreateIncidentInputSchema>;

export const RootlyGetIncidentInputSchema = z.object({
  incidentId: z.string().min(1).max(MAX_ID_LENGTH).describe('The Rootly incident ID.'),
});
export type RootlyGetIncidentInput = z.infer<typeof RootlyGetIncidentInputSchema>;

export const RootlyListIncidentsInputSchema = z.object({
  status: z
    .string()
    .max(50)
    .optional()
    .describe('Filter by status, e.g. "started", "mitigated", "resolved".'),
  severityId: z.string().max(MAX_ID_LENGTH).optional().describe('Filter by severity resource ID.'),
  serviceIds: z
    .array(z.string().max(MAX_ID_LENGTH))
    .optional()
    .describe('Filter by affected service resource IDs.'),
  teamIds: z
    .array(z.string().max(MAX_ID_LENGTH))
    .optional()
    .describe('Filter by owning team (group) resource IDs.'),
  search: z
    .string()
    .max(500)
    .optional()
    .describe('Free-text search across incident title/summary.'),
  createdAtGte: z
    .string()
    .max(64)
    .optional()
    .describe('Only incidents created at or after this ISO 8601 timestamp.'),
  createdAtLte: z
    .string()
    .max(64)
    .optional()
    .describe('Only incidents created at or before this ISO 8601 timestamp.'),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Results per page (1-100). Defaults to 10.'),
  pageNumber: z.number().int().min(1).optional().describe('1-indexed page number.'),
});
export type RootlyListIncidentsInput = z.infer<typeof RootlyListIncidentsInputSchema>;

export const RootlyUpdateIncidentInputSchema = z.object({
  incidentId: z.string().min(1).max(MAX_ID_LENGTH).describe('The Rootly incident ID to update.'),
  title: z.string().max(MAX_TITLE_LENGTH).optional().describe('New incident title.'),
  summary: z.string().max(MAX_TEXT_LENGTH).optional().describe('New incident summary.'),
  severityId: z.string().max(MAX_ID_LENGTH).optional().describe('New severity resource ID.'),
  serviceIds: z
    .array(z.string().max(MAX_ID_LENGTH))
    .optional()
    .describe('Replacement set of affected service resource IDs.'),
  groupIds: z
    .array(z.string().max(MAX_ID_LENGTH))
    .optional()
    .describe('Replacement set of owning team (group) resource IDs.'),
  labels: z
    .record(z.string().max(100), z.string().max(200))
    .optional()
    .describe('Replacement key-value map of labels (e.g. {"platform": "osx", "version": "1.29"}).'),
});
export type RootlyUpdateIncidentInput = z.infer<typeof RootlyUpdateIncidentInputSchema>;

export const RootlyIncidentLifecycleInputSchema = z.object({
  incidentId: z.string().min(1).max(MAX_ID_LENGTH).describe('The Rootly incident ID.'),
  message: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .optional()
    .describe('Optional message describing this transition.'),
});
export type RootlyIncidentLifecycleInput = z.infer<typeof RootlyIncidentLifecycleInputSchema>;

export const RootlyTriageIncidentInputSchema = z.object({
  incidentId: z
    .string()
    .min(1)
    .max(MAX_ID_LENGTH)
    .describe('The Rootly incident ID to move into triage.'),
});
export type RootlyTriageIncidentInput = z.infer<typeof RootlyTriageIncidentInputSchema>;

export const RootlyAssignIncidentUserInputSchema = z.object({
  incidentId: z.string().min(1).max(MAX_ID_LENGTH).describe('The Rootly incident ID.'),
  userId: z.string().min(1).max(MAX_ID_LENGTH).describe('The Rootly user ID to assign.'),
  incidentRoleId: z
    .string()
    .min(1)
    .max(MAX_ID_LENGTH)
    .describe('The incident role resource ID to assign the user to (e.g. Incident Commander).'),
});
export type RootlyAssignIncidentUserInput = z.infer<typeof RootlyAssignIncidentUserInputSchema>;

export const RootlyCreateActionItemInputSchema = z.object({
  incidentId: z
    .string()
    .min(1)
    .max(MAX_ID_LENGTH)
    .describe('The Rootly incident ID to file the action item on.'),
  summary: z.string().min(1).max(MAX_TITLE_LENGTH).describe('Action item summary.'),
  description: z.string().max(MAX_TEXT_LENGTH).optional().describe('Action item description.'),
  kind: z
    .enum(['task', 'follow_up'])
    .optional()
    .describe('Type of action item. Defaults to "task".'),
  priority: z.enum(['high', 'medium', 'low']).optional().describe('Action item priority.'),
  status: z
    .enum(['open', 'in_progress', 'cancelled', 'done'])
    .optional()
    .describe('Action item status. Defaults to "open".'),
  assignedToUserId: z
    .string()
    .max(MAX_ID_LENGTH)
    .optional()
    .describe('User ID to assign the action item to.'),
  dueDate: z.string().max(64).optional().describe('ISO 8601 due date.'),
});
export type RootlyCreateActionItemInput = z.infer<typeof RootlyCreateActionItemInputSchema>;

export const RootlyListActionItemsInputSchema = z.object({
  incidentId: z
    .string()
    .max(MAX_ID_LENGTH)
    .optional()
    .describe("Scope to a single incident's action items. Omit to list org-wide."),
  status: z.string().max(50).optional().describe('Filter by status.'),
  priority: z.string().max(50).optional().describe('Filter by priority.'),
});
export type RootlyListActionItemsInput = z.infer<typeof RootlyListActionItemsInputSchema>;

export const RootlyCreateTimelineEventInputSchema = z.object({
  incidentId: z
    .string()
    .min(1)
    .max(MAX_ID_LENGTH)
    .describe('The Rootly incident ID to post the event to.'),
  event: z
    .string()
    .min(1)
    .max(MAX_TEXT_LENGTH)
    .describe('The note or milestone text to record on the incident timeline.'),
  visibility: z
    .enum(['internal', 'external'])
    .optional()
    .describe('Event visibility. Defaults to "internal".'),
});
export type RootlyCreateTimelineEventInput = z.infer<typeof RootlyCreateTimelineEventInputSchema>;

export const RootlyListSeveritiesInputSchema = z.object({});
export type RootlyListSeveritiesInput = z.infer<typeof RootlyListSeveritiesInputSchema>;

export const RootlyListServicesInputSchema = z.object({
  name: z.string().max(200).optional().describe('Filter by exact service name.'),
});
export type RootlyListServicesInput = z.infer<typeof RootlyListServicesInputSchema>;

export const RootlyListTeamsInputSchema = z.object({
  name: z.string().max(200).optional().describe('Filter by exact team name.'),
});
export type RootlyListTeamsInput = z.infer<typeof RootlyListTeamsInputSchema>;

export const RootlyAddIncidentSubscribersInputSchema = z.object({
  incidentId: z.string().min(1).max(MAX_ID_LENGTH).describe('The Rootly incident ID.'),
  userIds: z
    .array(z.string().max(MAX_ID_LENGTH))
    .min(1)
    .describe('User IDs to subscribe to incident updates.'),
});
export type RootlyAddIncidentSubscribersInput = z.infer<
  typeof RootlyAddIncidentSubscribersInputSchema
>;

export const RootlyListAlertsInputSchema = z.object({
  status: z
    .enum(['open', 'triggered', 'acknowledged', 'resolved', 'deferred'])
    .optional()
    .describe('Filter alerts by status.'),
  source: z.string().max(200).optional().describe('Filter by alert source.'),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Results per page (1-100). Defaults to 10.'),
  pageNumber: z.number().int().min(1).optional().describe('1-indexed page number.'),
});
export type RootlyListAlertsInput = z.infer<typeof RootlyListAlertsInputSchema>;

export const RootlyGetAlertInputSchema = z.object({
  alertId: z.string().min(1).max(MAX_ID_LENGTH).describe('The Rootly alert ID.'),
});
export type RootlyGetAlertInput = z.infer<typeof RootlyGetAlertInputSchema>;

export const RootlyAcknowledgeAlertInputSchema = z.object({
  alertId: z
    .string()
    .min(1)
    .max(MAX_ID_LENGTH)
    .describe('The Rootly alert ID to acknowledge. The alert must be in "triggered" status.'),
});
export type RootlyAcknowledgeAlertInput = z.infer<typeof RootlyAcknowledgeAlertInputSchema>;

export const RootlyResolveAlertInputSchema = z.object({
  alertId: z.string().min(1).max(MAX_ID_LENGTH).describe('The Rootly alert ID to resolve.'),
  resolutionMessage: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .optional()
    .describe('Optional resolution note.'),
  resolveRelatedIncidents: z
    .boolean()
    .optional()
    .describe('Also resolve incidents linked to this alert.'),
});
export type RootlyResolveAlertInput = z.infer<typeof RootlyResolveAlertInputSchema>;
