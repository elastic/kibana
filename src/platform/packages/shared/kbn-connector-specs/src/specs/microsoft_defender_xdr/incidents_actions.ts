/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionDefinition } from '../../connector_spec';
import { graphRequest } from './client';
import {
  AddIncidentCommentInputSchema,
  GetIncidentInputSchema,
  ListIncidentsInputSchema,
  MergeIncidentsInputSchema,
  UpdateIncidentInputSchema,
} from './types';
import type {
  AddIncidentCommentInput,
  CorrelationReason,
  GetIncidentInput,
  ListIncidentsInput,
  MergeIncidentsInput,
  UpdateIncidentInput,
} from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const incidentActions: Record<string, ActionDefinition<any, any, any>> = {
  listIncidents: {
    isTool: true,
    scope: 'read',
    description:
      'List Microsoft Defender XDR incidents with optional OData filtering, pagination, and ' +
      'optional expansion of related alerts. Use to get an overview of active threats, filter ' +
      'by severity or status, or page through a large incident list.',
    input: ListIncidentsInputSchema,
    handler: async (ctx, input: ListIncidentsInput) => {
      const params: Record<string, string | number> = { $top: input.top, $skip: input.skip };
      if (input.filter) params.$filter = input.filter;
      if (input.includeAlerts) params.$expand = 'alerts';
      const data = await graphRequest(ctx, 'get', '/security/incidents', 'listIncidents', {
        params,
      });
      return { value: data?.value ?? [], nextLink: data?.['@odata.nextLink'] ?? null };
    },
  },

  getIncident: {
    isTool: true,
    scope: 'read',
    description:
      'Retrieve details for a single Microsoft Defender XDR incident by its numeric ID. ' +
      'Set includeAlerts to true to expand related alerts and evidence (including mdeDeviceId for use with the Microsoft Defender for Endpoint connector). ' +
      'Omit includeAlerts when you only need incident status, assignee, or classification to avoid oversized responses.',
    input: GetIncidentInputSchema,
    handler: async (ctx, input: GetIncidentInput) => {
      const params: Record<string, string> = {};
      if (input.includeAlerts) params.$expand = 'alerts';
      return graphRequest(
        ctx,
        'get',
        `/security/incidents/${encodeURIComponent(input.incidentId)}`,
        'getIncident',
        { params }
      );
    },
  },

  updateIncident: {
    isTool: false,
    scope: 'destroy',
    description:
      'Update a Microsoft Defender XDR incident — change status (active/resolved/inProgress), ' +
      'assign to an analyst, set classification and determination, adjust severity, ' +
      'or replace custom tags. Provide only the fields you want to change. ' +
      'To add a comment, use addIncidentComment instead.',
    input: UpdateIncidentInputSchema,
    handler: async (ctx, input: UpdateIncidentInput) => {
      const { incidentId, ...fields } = input;
      const body: Record<string, unknown> = {};
      if (fields.status !== undefined) body.status = fields.status;
      if (fields.assignedTo !== undefined) body.assignedTo = fields.assignedTo;
      if (fields.classification !== undefined) body.classification = fields.classification;
      if (fields.determination !== undefined) body.determination = fields.determination;
      if (fields.severity !== undefined) body.severity = fields.severity;
      if (fields.customTags !== undefined) body.customTags = fields.customTags;
      return graphRequest(
        ctx,
        'patch',
        `/security/incidents/${encodeURIComponent(incidentId)}`,
        'updateIncident',
        { body }
      );
    },
  },

  addIncidentComment: {
    isTool: true,
    scope: 'write',
    description:
      'Append a comment to a Microsoft Defender XDR incident activity log. Use to record analyst ' +
      'notes, investigation findings, or escalation decisions directly on the incident for audit trail purposes.',
    input: AddIncidentCommentInputSchema,
    handler: async (ctx, input: AddIncidentCommentInput) =>
      graphRequest(
        ctx,
        'post',
        `/security/incidents/${encodeURIComponent(input.incidentId)}/comments`,
        'addIncidentComment',
        {
          body: { comment: input.comment },
        }
      ),
  },

  mergeIncidents: {
    isTool: false,
    scope: 'destroy',
    description:
      'Merge two or more Microsoft Defender XDR incidents into a single incident. ' +
      'The first incident ID in the list becomes the primary (surviving) incident; the others are merged into it. ' +
      'Use to consolidate duplicate detections or combine related incidents from the same attack campaign. ' +
      'This action is irreversible — verify the incident IDs with listIncidents or getIncident first.',
    input: MergeIncidentsInputSchema,
    handler: async (ctx, input: MergeIncidentsInput) => {
      const body: Record<string, unknown> = {
        incidentIds: input.incidentIds,
        incidentComment: input.comment,
      };
      if (input.mergeReasons !== undefined) {
        body.mergeReasons = (input.mergeReasons as CorrelationReason[]).join(',');
      }
      return graphRequest(ctx, 'post', '/security/incidents/mergeIncidents', 'mergeIncidents', {
        body,
      });
    },
  },
};
