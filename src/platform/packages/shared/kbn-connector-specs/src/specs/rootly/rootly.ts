/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { AxiosError } from 'axios';
import type { ConnectorSpec } from '../../connector_spec';
import {
  RootlyCreateIncidentInputSchema,
  RootlyGetIncidentInputSchema,
  RootlyListIncidentsInputSchema,
  RootlyUpdateIncidentInputSchema,
  RootlyIncidentLifecycleInputSchema,
  RootlyTriageIncidentInputSchema,
  RootlyAssignIncidentUserInputSchema,
  RootlyCreateActionItemInputSchema,
  RootlyListActionItemsInputSchema,
  RootlyCreateTimelineEventInputSchema,
  RootlyListSeveritiesInputSchema,
  RootlyListServicesInputSchema,
  RootlyListTeamsInputSchema,
  RootlyAddIncidentSubscribersInputSchema,
  RootlyListAlertsInputSchema,
  RootlyGetAlertInputSchema,
  RootlyAcknowledgeAlertInputSchema,
  RootlyResolveAlertInputSchema,
  type JsonApiListResponse,
  type JsonApiRelationshipRef,
  type JsonApiResource,
  type JsonApiSingleResponse,
  type RootlyCreateIncidentInput,
  type RootlyGetIncidentInput,
  type RootlyListIncidentsInput,
  type RootlyUpdateIncidentInput,
  type RootlyIncidentLifecycleInput,
  type RootlyTriageIncidentInput,
  type RootlyAssignIncidentUserInput,
  type RootlyCreateActionItemInput,
  type RootlyListActionItemsInput,
  type RootlyCreateTimelineEventInput,
  type RootlyListServicesInput,
  type RootlyListTeamsInput,
  type RootlyAddIncidentSubscribersInput,
  type RootlyListAlertsInput,
  type RootlyGetAlertInput,
  type RootlyAcknowledgeAlertInput,
  type RootlyResolveAlertInput,
} from './types';

const ROOTLY_BASE_URL = 'https://api.rootly.com/v1';
const JSON_API_HEADERS = {
  'Content-Type': 'application/vnd.api+json',
  Accept: 'application/vnd.api+json',
};

// Rootly's `services` and `groups` incident fields are JSON:API relationships, not plain
// attributes: without `?include=services,groups` on the request and this resolution step, they
// come back as bare relationship refs (or are dropped entirely), even though the write side
// (service_ids/group_ids) succeeded. Resolve them against the sideloaded `included` array so
// callers see `{ id, name }` instead of nothing.
const RELATIONSHIP_SUMMARY_KEYS = ['services', 'groups'] as const;

const resolveRelationshipRef = (ref: JsonApiRelationshipRef, included: JsonApiResource[]) => {
  const match = included.find((resource) => resource.type === ref.type && resource.id === ref.id);
  return { id: ref.id, name: match?.attributes?.name };
};

const flattenResource = (resource: JsonApiResource, included: JsonApiResource[] = []) => {
  const relationshipSummaries: Record<string, unknown> = {};
  for (const key of RELATIONSHIP_SUMMARY_KEYS) {
    const data = resource.relationships?.[key]?.data;
    if (!data) continue;
    const refs = Array.isArray(data) ? data : [data];
    relationshipSummaries[key] = refs.map((ref) => resolveRelationshipRef(ref, included));
  }
  return {
    id: resource.id,
    ...resource.attributes,
    ...relationshipSummaries,
  };
};

const flattenSingle = (response: JsonApiSingleResponse) =>
  flattenResource(response.data, response.included);

const flattenList = (response: JsonApiListResponse) => ({
  items: response.data.map((resource) => flattenResource(resource, response.included)),
  meta: response.meta,
});

function formatRootlyError(action: string, error: unknown): Error {
  const err = error as AxiosError<{ errors?: Array<{ title?: string; detail?: string }> }>;
  const detail =
    err.response?.data?.errors?.map((e) => e.detail ?? e.title).join('; ') ?? err.message;
  return new Error(
    `Rootly ${action} failed (status ${err.response?.status ?? 'unknown'}): ${detail}`
  );
}

export const Rootly: ConnectorSpec = {
  metadata: {
    id: '.rootly',
    displayName: 'Rootly',
    description: i18n.translate('core.kibanaConnectorSpecs.rootly.metadata.description', {
      defaultMessage:
        'Declare, read, and drive Rootly incidents through their lifecycle, and triage, acknowledge, and resolve Rootly alerts.',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'bearer',
        isRecommended: true,
        defaults: {},
        overrides: {
          meta: {
            token: {
              label: i18n.translate('core.kibanaConnectorSpecs.rootly.auth.bearer.token.label', {
                defaultMessage: 'API Key',
              }),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.rootly.auth.bearer.token.helpText',
                {
                  defaultMessage: 'A Rootly API key (Organization Settings > API Keys).',
                }
              ),
            },
          },
        },
      },
    ],
  },

  schema: lazySchema(() => z.object({})),

  actions: {
    createIncident: {
      isTool: true,
      description:
        "Declare a new Rootly incident, the core outbound action that mobilizes responders from a Kibana alert. Returns the new incident's ID. Use listSeverities and listServices to resolve real severity/service IDs first.",
      input: RootlyCreateIncidentInputSchema,
      handler: async (ctx, input: RootlyCreateIncidentInput) => {
        const attributes: Record<string, unknown> = { title: input.title };
        if (input.summary) attributes.summary = input.summary;
        if (input.severityId) attributes.severity_id = input.severityId;
        if (input.serviceIds) attributes.service_ids = input.serviceIds;
        if (input.groupIds) attributes.group_ids = input.groupIds;
        if (input.status) attributes.status = input.status;
        if (input.private !== undefined) attributes.private = input.private;
        if (input.labels) attributes.labels = input.labels;

        try {
          const response = await ctx.client.post<JsonApiSingleResponse>(
            `${ROOTLY_BASE_URL}/incidents`,
            { data: { type: 'incidents', attributes } },
            { params: { include: 'services,groups' }, headers: JSON_API_HEADERS }
          );
          return flattenSingle(response.data);
        } catch (error) {
          throw formatRootlyError('createIncident', error);
        }
      },
    },

    getIncident: {
      isTool: true,
      description:
        'Get a single Rootly incident by ID, so a workflow can branch on its current state before it acts.',
      input: RootlyGetIncidentInputSchema,
      handler: async (ctx, input: RootlyGetIncidentInput) => {
        try {
          const response = await ctx.client.get<JsonApiSingleResponse>(
            `${ROOTLY_BASE_URL}/incidents/${input.incidentId}`,
            { params: { include: 'services,groups' }, headers: JSON_API_HEADERS }
          );
          return flattenSingle(response.data);
        } catch (error) {
          throw formatRootlyError('getIncident', error);
        }
      },
    },

    listIncidents: {
      isTool: true,
      description:
        'List Rootly incidents filtered by status, severity, service, team, free-text search, or creation time window, so a workflow can dedupe and correlate before it acts.',
      input: RootlyListIncidentsInputSchema,
      handler: async (ctx, input: RootlyListIncidentsInput) => {
        const params: Record<string, string | number> = {};
        if (input.status) params['filter[status]'] = input.status;
        if (input.severityId) params['filter[severity_id]'] = input.severityId;
        if (input.serviceIds) params['filter[service_ids]'] = input.serviceIds.join(',');
        if (input.teamIds) params['filter[team_ids]'] = input.teamIds.join(',');
        if (input.search) params['filter[search]'] = input.search;
        if (input.createdAtGte) params['filter[created_at][gte]'] = input.createdAtGte;
        if (input.createdAtLte) params['filter[created_at][lte]'] = input.createdAtLte;
        if (input.pageSize) params['page[size]'] = input.pageSize;
        if (input.pageNumber) params['page[number]'] = input.pageNumber;

        params.include = 'services,groups';

        try {
          const response = await ctx.client.get<JsonApiListResponse>(
            `${ROOTLY_BASE_URL}/incidents`,
            {
              params,
              headers: JSON_API_HEADERS,
            }
          );
          return flattenList(response.data);
        } catch (error) {
          throw formatRootlyError('listIncidents', error);
        }
      },
    },

    updateIncident: {
      isTool: true,
      description:
        "Patch a Rootly incident's title, summary, severity, services, teams, or labels in place, so a workflow can enrich or reclassify an incident as it learns more.",
      input: RootlyUpdateIncidentInputSchema,
      handler: async (ctx, input: RootlyUpdateIncidentInput) => {
        const attributes: Record<string, unknown> = {};
        if (input.title) attributes.title = input.title;
        if (input.summary) attributes.summary = input.summary;
        if (input.severityId) attributes.severity_id = input.severityId;
        if (input.serviceIds) attributes.service_ids = input.serviceIds;
        if (input.groupIds) attributes.group_ids = input.groupIds;
        if (input.labels) attributes.labels = input.labels;

        try {
          const response = await ctx.client.put<JsonApiSingleResponse>(
            `${ROOTLY_BASE_URL}/incidents/${input.incidentId}`,
            { data: { type: 'incidents', attributes } },
            { params: { include: 'services,groups' }, headers: JSON_API_HEADERS }
          );
          return flattenSingle(response.data);
        } catch (error) {
          throw formatRootlyError('updateIncident', error);
        }
      },
    },

    triageIncident: {
      isTool: true,
      description: 'Move a Rootly incident into triage while severity is still being assessed.',
      input: RootlyTriageIncidentInputSchema,
      handler: async (ctx, input: RootlyTriageIncidentInput) => {
        try {
          const response = await ctx.client.put<JsonApiSingleResponse>(
            `${ROOTLY_BASE_URL}/incidents/${input.incidentId}/in_triage`,
            { data: { type: 'incidents' } },
            { params: { include: 'services,groups' }, headers: JSON_API_HEADERS }
          );
          return flattenSingle(response.data);
        } catch (error) {
          throw formatRootlyError('triageIncident', error);
        }
      },
    },

    mitigateIncident: {
      isTool: true,
      description:
        'Move a Rootly incident to mitigated once impact is contained, the first lifecycle transition a response workflow drives to closure.',
      input: RootlyIncidentLifecycleInputSchema,
      handler: async (ctx, input: RootlyIncidentLifecycleInput) => {
        const attributes = input.message ? { mitigation_message: input.message } : {};
        try {
          const response = await ctx.client.put<JsonApiSingleResponse>(
            `${ROOTLY_BASE_URL}/incidents/${input.incidentId}/mitigate`,
            { data: { type: 'incidents', attributes } },
            { params: { include: 'services,groups' }, headers: JSON_API_HEADERS }
          );
          return flattenSingle(response.data);
        } catch (error) {
          throw formatRootlyError('mitigateIncident', error);
        }
      },
    },

    resolveIncident: {
      isTool: true,
      description:
        'Move a Rootly incident to resolved once remediation is verified, closing the incident lifecycle.',
      input: RootlyIncidentLifecycleInputSchema,
      handler: async (ctx, input: RootlyIncidentLifecycleInput) => {
        const attributes = input.message ? { resolution_message: input.message } : {};
        try {
          const response = await ctx.client.put<JsonApiSingleResponse>(
            `${ROOTLY_BASE_URL}/incidents/${input.incidentId}/resolve`,
            { data: { type: 'incidents', attributes } },
            { params: { include: 'services,groups' }, headers: JSON_API_HEADERS }
          );
          return flattenSingle(response.data);
        } catch (error) {
          throw formatRootlyError('resolveIncident', error);
        }
      },
    },

    cancelIncident: {
      isTool: true,
      description: 'Cancel a Rootly incident as a false positive so it does not skew metrics.',
      input: RootlyIncidentLifecycleInputSchema,
      handler: async (ctx, input: RootlyIncidentLifecycleInput) => {
        const attributes = input.message ? { cancellation_message: input.message } : {};
        try {
          const response = await ctx.client.put<JsonApiSingleResponse>(
            `${ROOTLY_BASE_URL}/incidents/${input.incidentId}/cancel`,
            { data: { type: 'incidents', attributes } },
            { params: { include: 'services,groups' }, headers: JSON_API_HEADERS }
          );
          return flattenSingle(response.data);
        } catch (error) {
          throw formatRootlyError('cancelIncident', error);
        }
      },
    },

    assignIncidentUser: {
      isTool: true,
      description:
        'Assign a responder to a Rootly incident by user ID and incident role ID (e.g. Incident Commander), so automated mobilization routes the incident to a person, not just a queue.',
      input: RootlyAssignIncidentUserInputSchema,
      handler: async (ctx, input: RootlyAssignIncidentUserInput) => {
        try {
          const response = await ctx.client.post<JsonApiSingleResponse>(
            `${ROOTLY_BASE_URL}/incidents/${input.incidentId}/assign_role_to_user`,
            {
              data: {
                type: 'incidents',
                attributes: { user_id: input.userId, incident_role_id: input.incidentRoleId },
              },
            },
            { params: { include: 'services,groups' }, headers: JSON_API_HEADERS }
          );
          return flattenSingle(response.data);
        } catch (error) {
          throw formatRootlyError('assignIncidentUser', error);
        }
      },
    },

    addIncidentSubscribers: {
      isTool: true,
      description:
        'Subscribe stakeholders to a Rootly incident so they receive updates, an automated notification fan-out from the workflow.',
      input: RootlyAddIncidentSubscribersInputSchema,
      handler: async (ctx, input: RootlyAddIncidentSubscribersInput) => {
        try {
          const response = await ctx.client.post<JsonApiSingleResponse>(
            `${ROOTLY_BASE_URL}/incidents/${input.incidentId}/add_subscribers`,
            { data: { type: 'incidents', attributes: { user_ids: input.userIds } } },
            { params: { include: 'services,groups' }, headers: JSON_API_HEADERS }
          );
          return flattenSingle(response.data);
        } catch (error) {
          throw formatRootlyError('addIncidentSubscribers', error);
        }
      },
    },

    createActionItem: {
      isTool: true,
      description:
        'File a follow-up task on a Rootly incident, so remediation work is tracked and reminders can be driven.',
      input: RootlyCreateActionItemInputSchema,
      handler: async (ctx, input: RootlyCreateActionItemInput) => {
        const attributes: Record<string, unknown> = { summary: input.summary };
        if (input.description) attributes.description = input.description;
        if (input.kind) attributes.kind = input.kind;
        if (input.priority) attributes.priority = input.priority;
        if (input.status) attributes.status = input.status;
        if (input.assignedToUserId) attributes.assigned_to_user_id = input.assignedToUserId;
        if (input.dueDate) attributes.due_date = input.dueDate;

        try {
          const response = await ctx.client.post<JsonApiSingleResponse>(
            `${ROOTLY_BASE_URL}/incidents/${input.incidentId}/action_items`,
            { data: { type: 'incident_action_items', attributes } },
            { headers: JSON_API_HEADERS }
          );
          return flattenSingle(response.data);
        } catch (error) {
          throw formatRootlyError('createActionItem', error);
        }
      },
    },

    listActionItems: {
      isTool: true,
      description:
        'List action items on a Rootly incident (or org-wide if incidentId is omitted), filtered by status or priority.',
      input: RootlyListActionItemsInputSchema,
      handler: async (ctx, input: RootlyListActionItemsInput) => {
        const params: Record<string, string> = {};
        if (input.status) params['filter[status]'] = input.status;
        if (input.priority) params['filter[priority]'] = input.priority;

        const url = input.incidentId
          ? `${ROOTLY_BASE_URL}/incidents/${input.incidentId}/action_items`
          : `${ROOTLY_BASE_URL}/action_items`;

        try {
          const response = await ctx.client.get<JsonApiListResponse>(url, {
            params,
            headers: JSON_API_HEADERS,
          });
          return flattenList(response.data);
        } catch (error) {
          throw formatRootlyError('listActionItems', error);
        }
      },
    },

    createTimelineEvent: {
      isTool: true,
      description:
        "Post a note or milestone to a Rootly incident's timeline, so automated actions are recorded where responders read the incident history.",
      input: RootlyCreateTimelineEventInputSchema,
      handler: async (ctx, input: RootlyCreateTimelineEventInput) => {
        const attributes: Record<string, unknown> = { event: input.event };
        if (input.visibility) attributes.visibility = input.visibility;

        try {
          const response = await ctx.client.post<JsonApiSingleResponse>(
            `${ROOTLY_BASE_URL}/incidents/${input.incidentId}/events`,
            { data: { type: 'incident_events', attributes } },
            { headers: JSON_API_HEADERS }
          );
          return flattenSingle(response.data);
        } catch (error) {
          throw formatRootlyError('createTimelineEvent', error);
        }
      },
    },

    listSeverities: {
      isTool: true,
      description:
        'List Rootly severity definitions and their resource IDs, so createIncident and updateIncident can set severity by a real ID instead of a guessed string.',
      input: RootlyListSeveritiesInputSchema,
      handler: async (ctx) => {
        try {
          const response = await ctx.client.get<JsonApiListResponse>(
            `${ROOTLY_BASE_URL}/severities`,
            {
              headers: JSON_API_HEADERS,
            }
          );
          return flattenList(response.data);
        } catch (error) {
          throw formatRootlyError('listSeverities', error);
        }
      },
    },

    listServices: {
      isTool: true,
      description:
        'List the Rootly service catalog, so a workflow can attach the affected service by reference when it opens or updates an incident.',
      input: RootlyListServicesInputSchema,
      handler: async (ctx, input: RootlyListServicesInput) => {
        const params: Record<string, string> = {};
        if (input.name) params['filter[name]'] = input.name;
        try {
          const response = await ctx.client.get<JsonApiListResponse>(
            `${ROOTLY_BASE_URL}/services`,
            {
              params,
              headers: JSON_API_HEADERS,
            }
          );
          return flattenList(response.data);
        } catch (error) {
          throw formatRootlyError('listServices', error);
        }
      },
    },

    listTeams: {
      isTool: true,
      description: 'List Rootly teams, so a workflow can set incident ownership by reference.',
      input: RootlyListTeamsInputSchema,
      handler: async (ctx, input: RootlyListTeamsInput) => {
        const params: Record<string, string> = {};
        if (input.name) params['filter[name]'] = input.name;
        try {
          const response = await ctx.client.get<JsonApiListResponse>(`${ROOTLY_BASE_URL}/teams`, {
            params,
            headers: JSON_API_HEADERS,
          });
          return flattenList(response.data);
        } catch (error) {
          throw formatRootlyError('listTeams', error);
        }
      },
    },

    listAlerts: {
      isTool: true,
      description:
        'List Rootly alerts filtered by status or source, feeding triage and correlation from the monitoring signal before an incident is declared.',
      input: RootlyListAlertsInputSchema,
      handler: async (ctx, input: RootlyListAlertsInput) => {
        const params: Record<string, string | number> = {};
        if (input.status) params['filter[status]'] = input.status;
        if (input.source) params['filter[source]'] = input.source;
        if (input.pageSize) params['page[size]'] = input.pageSize;
        if (input.pageNumber) params['page[number]'] = input.pageNumber;

        try {
          const response = await ctx.client.get<JsonApiListResponse>(`${ROOTLY_BASE_URL}/alerts`, {
            params,
            headers: JSON_API_HEADERS,
          });
          return flattenList(response.data);
        } catch (error) {
          throw formatRootlyError('listAlerts', error);
        }
      },
    },

    getAlert: {
      isTool: true,
      description: 'Get a single Rootly alert by ID.',
      input: RootlyGetAlertInputSchema,
      handler: async (ctx, input: RootlyGetAlertInput) => {
        try {
          const response = await ctx.client.get<JsonApiSingleResponse>(
            `${ROOTLY_BASE_URL}/alerts/${input.alertId}`,
            { headers: JSON_API_HEADERS }
          );
          return flattenSingle(response.data);
        } catch (error) {
          throw formatRootlyError('getAlert', error);
        }
      },
    },

    acknowledgeAlert: {
      isTool: true,
      description:
        'Acknowledge a Rootly alert so on-call sees it is being handled. The alert must be in "triggered" status.',
      input: RootlyAcknowledgeAlertInputSchema,
      handler: async (ctx, input: RootlyAcknowledgeAlertInput) => {
        try {
          const response = await ctx.client.post<JsonApiSingleResponse>(
            `${ROOTLY_BASE_URL}/alerts/${input.alertId}/acknowledge`,
            {},
            { headers: JSON_API_HEADERS }
          );
          return flattenSingle(response.data);
        } catch (error) {
          throw formatRootlyError('acknowledgeAlert', error);
        }
      },
    },

    resolveAlert: {
      isTool: true,
      description:
        'Resolve a Rootly alert when the condition clears, closing the alert loop from a workflow. Optionally cascades to resolve linked incidents.',
      input: RootlyResolveAlertInputSchema,
      handler: async (ctx, input: RootlyResolveAlertInput) => {
        const attributes: Record<string, unknown> = {};
        if (input.resolutionMessage) attributes.resolution_message = input.resolutionMessage;
        if (input.resolveRelatedIncidents !== undefined) {
          attributes.resolve_related_incidents = input.resolveRelatedIncidents;
        }
        try {
          const response = await ctx.client.post<JsonApiSingleResponse>(
            `${ROOTLY_BASE_URL}/alerts/${input.alertId}/resolve`,
            { data: { type: 'alerts', attributes } },
            { headers: JSON_API_HEADERS }
          );
          return flattenSingle(response.data);
        } catch (error) {
          throw formatRootlyError('resolveAlert', error);
        }
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.rootly.test.description', {
      defaultMessage: 'Verifies the Rootly connection by listing severities',
    }),
    handler: async (ctx) => {
      try {
        const response = await ctx.client.get<JsonApiListResponse>(
          `${ROOTLY_BASE_URL}/severities`,
          {
            headers: JSON_API_HEADERS,
          }
        );
        return {
          message: `Successfully connected to Rootly (${response.data.data.length} severity level(s) visible).`,
        };
      } catch (error) {
        throw formatRootlyError('test', error);
      }
    },
  },

  skill: [
    'Use listSeverities and listServices/listTeams to resolve real resource IDs before calling createIncident or updateIncident — severity, service, and team fields take Rootly resource IDs, not free-text names.',
    'Use listIncidents (with status/severity/service/team/search filters) or getIncident as the primary read path before deciding on an action.',
    'Drive an incident through its lifecycle with triageIncident (early), mitigateIncident (impact contained), resolveIncident (remediation verified), or cancelIncident (false positive) — use updateIncident only for enrichment fields like title, summary, or reclassification, not lifecycle transitions.',
    'assignIncidentUser requires both a user ID and an incident role ID (e.g. Incident Commander) — you must already know the role ID, Rootly does not expose a lookup in this connector.',
    'Use createActionItem and listActionItems to track follow-up work, and createTimelineEvent to record notes/milestones responders will see in the incident history.',
    'Use listAlerts/getAlert to triage monitoring signal before declaring an incident, then acknowledgeAlert once on-call is handling it and resolveAlert (optionally with resolveRelatedIncidents) once the condition clears.',
  ].join('\n'),
};
