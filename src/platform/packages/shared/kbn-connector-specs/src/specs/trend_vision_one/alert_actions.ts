/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import type { ListPage, Params } from './client';
import {
  budgetLeft,
  buildFilter,
  checkNextLink,
  filterHeader,
  getApiOrigin,
  getHeader,
  vendorRequest,
  withoutDeprecated,
} from './client';
import { ALERTS_MAX_RESULTS, ALERTS_PAGE_SIZE, API_PREFIX, MIN_PAGE_BUDGET_MS } from './constants';
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
/** Pages of 10 up to the 200-alert maximum; the product may also answer one alert per page. */
const MAX_PAGES = Math.ceil(ALERTS_MAX_RESULTS / ALERTS_PAGE_SIZE);

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

const isOnNextLinkPath = (ctx: ActionContext, link: string): string | null => {
  try {
    return checkNextLink(ctx, link, ALERTS_PATH);
  } catch {
    return null;
  }
};

/** Absolute link of the first page of a listing, so a cut first page can be read again. */
const pageUrl = (ctx: ActionContext, params: Params): string => {
  const link = new URL(`${getApiOrigin(ctx)}${API_PREFIX}${ALERTS_PATH}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') link.searchParams.set(key, String(value));
  }
  return link.href;
};

export const alertActions: ConnectorSpec['actions'] = {
  listAlerts: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.listAlerts,
    input: ListAlertsInputSchema,
    handler: async (ctx, input: ListAlertsInput) => {
      const filter = buildFilter([
        ['status', input.status],
        ['investigationResult', input.investigationResult],
        ['severity', input.severity],
      ]);
      const params = {
        startDateTime: input.startDateTime,
        endDateTime: input.endDateTime,
        dateTimeTarget: input.dateTimeTarget,
        orderBy: input.orderBy,
      };
      let url = input.nextLink ? checkNextLink(ctx, input.nextLink, ALERTS_PATH) : undefined;
      const items: unknown[] = [];
      const seen = new Set<string>();
      let totalCount: number | null = null;
      let nextLink: string | null = null;
      let nextLinkRepeats = 0;
      let pagesRead = 0;
      while (pagesRead < MAX_PAGES) {
        const { data } = await vendorRequest<ListPage>(ctx, {
          action: 'listAlerts',
          method: 'GET',
          path: ALERTS_PATH,
          url,
          params,
          headers: filterHeader(filter),
          mutating: false,
        });
        pagesRead++;
        totalCount = data?.totalCount ?? totalCount;
        const pageItems = (Array.isArray(data?.items) ? data.items : []).map(withoutDeprecated);
        const room = input.maxResults - items.length;
        items.push(...pageItems.slice(0, room));
        nextLink = data?.nextLink ?? null;
        if (pageItems.length > room) {
          // The page holds more alerts than maxResults allows: continue from this page again so
          // no alert is skipped; the first `room` alerts of that read were already returned.
          // maxResults is at least the page size (10), so the next call with the same maxResults
          // reads this whole page and moves past it.
          nextLink = url ?? pageUrl(ctx, params);
          nextLinkRepeats = room;
          break;
        }
        if (!nextLink || items.length >= input.maxResults || seen.has(nextLink)) break;
        // Too little of the action's time budget is left for another page: return what was read
        // and the nextLink of the page not read.
        if (budgetLeft(ctx) < MIN_PAGE_BUDGET_MS) break;
        seen.add(nextLink);
        const next = isOnNextLinkPath(ctx, nextLink);
        if (!next) break;
        url = next;
      }
      return { totalCount, count: items.length, items, nextLink, nextLinkRepeats, pagesRead };
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
      if (etag === undefined) {
        const current = await readAlert(ctx, 'updateAlertStatus', input.id);
        const unchanged = Object.entries(changes).every(
          ([field, value]) => current.alert[field] === value
        );
        if (unchanged) {
          return { id: input.id, updated: false, outcome: 'skipped', ...changes };
        }
        etag = current.etag ?? undefined;
      }
      await vendorRequest(ctx, {
        action: 'updateAlertStatus',
        method: 'PATCH',
        path: alertPath(input.id),
        data: changes,
        headers: etag ? { 'If-Match': etag } : undefined,
        mutating: true,
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
      const noteId = location ? location.split('?')[0].split('/').filter(Boolean).pop() : undefined;
      return { alertId: input.alertId, noteId: noteId ? decodeURIComponent(noteId) : null };
    },
  },
};
