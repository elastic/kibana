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
  AddAlertCommentInputSchema,
  GetAlertInputSchema,
  ListAlertsInputSchema,
  UpdateAlertInputSchema,
} from './types';
import type {
  AddAlertCommentInput,
  GetAlertInput,
  ListAlertsInput,
  UpdateAlertInput,
} from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const alertActions: Record<string, ActionDefinition<any, any, any>> = {
  listAlerts: {
    isTool: true,
    scope: 'read',
    description:
      'List Microsoft Defender XDR alerts (alerts_v2) with optional OData filtering and pagination. ' +
      'Returns cross-product alerts from all Defender services (Endpoint, Office 365, Identity, Cloud Apps). ' +
      'Each alert includes evidence with mdeDeviceId for affected endpoints, usable with the Microsoft Defender for Endpoint connector.',
    input: ListAlertsInputSchema,
    handler: async (ctx, input: ListAlertsInput) => {
      const params: Record<string, string | number> = { $top: input.top, $skip: input.skip };
      if (input.filter) params.$filter = input.filter;
      const data = await graphRequest(ctx, 'get', '/security/alerts_v2', 'listAlerts', {
        params,
      });
      return { value: data?.value ?? [], nextLink: data?.['@odata.nextLink'] ?? null };
    },
  },

  getAlert: {
    isTool: true,
    scope: 'read',
    description:
      'Retrieve full details for a single Microsoft Defender XDR alert including evidence ' +
      '(affected devices, users, files, processes, and network connections). ' +
      'Device evidence includes mdeDeviceId which can be passed to the Microsoft Defender for Endpoint connector for containment or live-response actions.',
    input: GetAlertInputSchema,
    handler: async (ctx, input: GetAlertInput) =>
      graphRequest(
        ctx,
        'get',
        `/security/alerts_v2/${encodeURIComponent(input.alertId)}`,
        'getAlert'
      ),
  },

  updateAlert: {
    isTool: false,
    scope: 'destroy',
    description:
      'Update a Microsoft Defender XDR alert independently of its parent incident — change status ' +
      '(new/inProgress/resolved), assign to an analyst, or set classification and determination. ' +
      'Use for triage that does not warrant touching the full incident yet. Provide only the fields you want to change.',
    input: UpdateAlertInputSchema,
    handler: async (ctx, input: UpdateAlertInput) => {
      const { alertId, ...fields } = input;
      const body: Record<string, unknown> = {};
      if (fields.status !== undefined) body.status = fields.status;
      if (fields.assignedTo !== undefined) body.assignedTo = fields.assignedTo;
      if (fields.classification !== undefined) body.classification = fields.classification;
      if (fields.determination !== undefined) body.determination = fields.determination;
      return graphRequest(
        ctx,
        'patch',
        `/security/alerts_v2/${encodeURIComponent(alertId)}`,
        'updateAlert',
        { body }
      );
    },
  },

  addAlertComment: {
    isTool: true,
    scope: 'write',
    description:
      'Append a comment to a Microsoft Defender XDR alert. Use to record triage notes, ' +
      'analyst observations, or escalation decisions directly on the alert for audit trail purposes.',
    input: AddAlertCommentInputSchema,
    handler: async (ctx, input: AddAlertCommentInput) =>
      graphRequest(
        ctx,
        'post',
        `/security/alerts_v2/${encodeURIComponent(input.alertId)}/comments`,
        'addAlertComment',
        {
          body: { comment: input.comment },
        }
      ),
  },
};
