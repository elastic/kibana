/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import {
  buildFilter,
  getHeader,
  lastPathSegment,
  vendorRequest,
  withoutDeprecated,
} from './client';
import { readOnePage } from './list_actions';
import { REQUEST_TIMEOUT_MS, UPDATE_ALERT_DEADLINE_MS, VENDOR } from './constants';
import { ACTION_DESCRIPTIONS } from './descriptions';
import type {
  AddAlertNoteInput,
  GetAlertDetailsInput,
  ListAlertsInput,
  UpdateAlertStatusInput,
} from './types';
import {
  AddAlertNoteInputSchema,
  GetAlertDetailsInputSchema,
  ListAlertsInputSchema,
  UpdateAlertStatusInputSchema,
} from './types';

const ALERTS_PATH = '/workbench/alerts';

const alertPath = (id: string): string => `${ALERTS_PATH}/${encodeURIComponent(id)}`;

/** Reads the alert and its ETag; the deprecated investigationStatus field is removed. */
const readAlert = async (ctx: ActionContext, action: string, id: string) => {
  const response = await vendorRequest<Record<string, unknown>>(ctx, {
    action,
    method: 'GET',
    path: alertPath(id),
    mutating: false,
    notFound: `Workbench alert ${id}`,
  });
  return {
    alert: withoutDeprecated(response.data ?? {}) as Record<string, unknown>,
    etag: getHeader(response, 'etag') ?? null,
  };
};

export const alertActions: ConnectorSpec['actions'] = {
  listAlerts: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.listAlerts,
    input: ListAlertsInputSchema,
    handler: async (ctx, input: ListAlertsInput) => {
      const page = await readOnePage(
        ctx,
        'listAlerts',
        ALERTS_PATH,
        {
          startDateTime: input.startDateTime,
          endDateTime: input.endDateTime,
          dateTimeTarget: input.dateTimeTarget,
          orderBy: input.orderBy,
        },
        buildFilter([
          ['status', input.status],
          ['investigationResult', input.investigationResult],
          ['severity', input.severity],
        ]),
        input.nextLink
      );
      return { ...page, items: page.items.map(withoutDeprecated) };
    },
  },

  getAlertDetails: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.getAlertDetails,
    input: GetAlertDetailsInputSchema,
    handler: async (ctx, input: GetAlertDetailsInput) => {
      const { alert, etag } = await readAlert(ctx, 'getAlertDetails', input.id);
      return { ...alert, etag };
    },
  },

  updateAlertStatus: {
    isTool: false,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.updateAlertStatus,
    input: UpdateAlertStatusInputSchema,
    handler: async (ctx, input: UpdateAlertStatusInput) => {
      const changes = {
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.investigationResult !== undefined
          ? { investigationResult: input.investigationResult }
          : {}),
      };
      let etag = input.etag;
      let patchTimeoutMs = REQUEST_TIMEOUT_MS;
      if (etag === undefined) {
        const startedAt = Date.now();
        const current = await readAlert(ctx, 'updateAlertStatus', input.id);
        const unchanged = Object.entries(changes).every(
          ([field, value]) => current.alert[field] === value
        );
        if (unchanged) {
          return { id: input.id, updated: false, outcome: 'skipped', ...changes };
        }
        if (!current.etag) {
          // Without If-Match the PATCH could overwrite a change made after the read: never send it.
          throw new Error(
            `${VENDOR} updateAlertStatus stopped: Workbench alert ${input.id} was read without an ETag, so the update was not sent (it could overwrite a newer change); nothing was changed. Try again later.`
          );
        }
        etag = current.etag;
        patchTimeoutMs = Math.min(
          REQUEST_TIMEOUT_MS,
          UPDATE_ALERT_DEADLINE_MS - (Date.now() - startedAt)
        );
      }
      await vendorRequest(ctx, {
        action: 'updateAlertStatus',
        method: 'PATCH',
        path: alertPath(input.id),
        data: changes,
        headers: { 'If-Match': etag },
        mutating: true,
        timeoutMs: patchTimeoutMs,
        notFound: `Workbench alert ${input.id}`,
      });
      return { id: input.id, updated: true, outcome: 'updated', ...changes };
    },
  },

  addAlertNote: {
    isTool: false,
    scope: 'write',
    description: ACTION_DESCRIPTIONS.addAlertNote,
    input: AddAlertNoteInputSchema,
    handler: async (ctx, input: AddAlertNoteInput) => {
      const response = await vendorRequest(ctx, {
        action: 'addAlertNote',
        method: 'POST',
        path: `${alertPath(input.alertId)}/notes`,
        data: { content: input.content },
        mutating: true,
        notFound: `Workbench alert ${input.alertId}`,
      });
      const location = getHeader(response, 'location');
      return { alertId: input.alertId, noteId: location ? lastPathSegment(location) : null };
    },
  },
};
