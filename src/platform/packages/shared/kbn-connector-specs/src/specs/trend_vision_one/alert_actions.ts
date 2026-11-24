/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import type { ListPage } from './client';
import {
  budgetLeft,
  buildFilter,
  checkNextLink,
  decodedId,
  filterHeader,
  getHeader,
  normaliseLink,
  pageUrl,
  vendorRequest,
  withoutDeprecated,
} from './client';
import { ALERTS_MAX_RESULTS, ALERTS_PAGE_SIZE, MIN_PAGE_BUDGET_MS, VENDOR } from './constants';
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
      // The page links read in this run, starting with the first one: a nextLink equal to one of
      // them would make the caller read the same pages again.
      const seen = new Set<string>([normaliseLink(ctx, url ?? pageUrl(ctx, ALERTS_PATH, params))]);
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
          // reads this whole page and moves past it. This only applies if the product ever returns
          // more than 10 alerts per page: maxResults is a multiple of 10, so a page of 10 is never cut.
          nextLink = url ?? pageUrl(ctx, ALERTS_PATH, params);
          nextLinkRepeats = room;
          break;
        }
        if (nextLink && seen.has(normaliseLink(ctx, nextLink))) {
          // The product repeated a cursor: there is no further page to continue from.
          nextLink = null;
          break;
        }
        if (!nextLink || items.length >= input.maxResults) break;
        // Too little of the action's time budget is left for another page: return what was read
        // and the nextLink of the page not read.
        if (budgetLeft(ctx) < MIN_PAGE_BUDGET_MS) break;
        seen.add(normaliseLink(ctx, nextLink));
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
        if (!current.etag) {
          // Without If-Match the PATCH could overwrite a change made after the read: never send it.
          throw new Error(
            `${VENDOR} updateAlertStatus stopped: Workbench alert ${input.id} was read without an ETag, so the update was not sent (it could overwrite a newer change); nothing was changed. Try again later.`
          );
        }
        etag = current.etag;
      }
      await vendorRequest(ctx, {
        action: 'updateAlertStatus',
        method: 'PATCH',
        path: alertPath(input.id),
        data: changes,
        headers: { 'If-Match': etag },
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
      return { alertId: input.alertId, noteId: noteId ? decodedId(noteId) : null };
    },
  },
};
