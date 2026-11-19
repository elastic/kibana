/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpec } from '../../connector_spec';
import { NGSIEM_SEARCH_ID_PATTERN, NGSIEM_SEARCH_PATH, SCOPES } from './constants';
import { falconRequest } from './client';
import type {
  GetNgSiemSearchResultsInput,
  StartNgSiemSearchInput,
  StopNgSiemSearchInput,
} from './types';
import {
  GetNgSiemSearchResultsInputSchema,
  StartNgSiemSearchInputSchema,
  StopNgSiemSearchInputSchema,
} from './types';

/** Path of one search job; the id is checked first so nothing else reaches the path. */
export const ngSiemJobPath = (id: string): string => {
  if (!NGSIEM_SEARCH_ID_PATTERN.test(id) || id.length > 128) {
    throw new Error('A search id has letters, digits, - and _ only (at most 128 characters).');
  }
  return `${NGSIEM_SEARCH_PATH}/${encodeURIComponent(id)}`;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const ngSiemActions: ConnectorSpec['actions'] = {
  startNgSiemSearch: {
    isTool: true,
    scope: 'read',
    description:
      'Start a Next-Gen SIEM search with a CQL query and a time range. Returns the search id for getNgSiemSearchResults.',
    input: StartNgSiemSearchInputSchema,
    handler: async (ctx, input: StartNgSiemSearchInput) => {
      const response = await falconRequest<unknown>(ctx, {
        method: 'POST',
        path: NGSIEM_SEARCH_PATH,
        data: {
          queryString: input.query,
          start: input.start,
          end: input.end ?? 'now',
          isLive: false,
        },
        // A repeated start could create a second search job: 429 only (always retried), never 5xx.
        retryServerErrors: false,
        textErrors: true,
        scope: SCOPES.ngsiemRead,
      });
      const id = isRecord(response.data) ? response.data.id : undefined;
      if (typeof id !== 'string' || id === '') {
        throw new Error('Falcon Next-Gen SIEM did not return a search id.');
      }
      return { id };
    },
  },
  getNgSiemSearchResults: {
    isTool: true,
    scope: 'read',
    description:
      'Read a Next-Gen SIEM search. While done is false, wait at least 2 seconds and call again; then page the events with offset and limit.',
    input: GetNgSiemSearchResultsInputSchema,
    handler: async (ctx, input: GetNgSiemSearchResultsInput) => {
      const response = await falconRequest<unknown>(ctx, {
        method: 'GET',
        path: ngSiemJobPath(input.id),
        params: { paginationOffset: input.offset, paginationLimit: input.limit },
        retryServerErrors: true,
        allowNotFound: true,
        textErrors: true,
        scope: SCOPES.ngsiemRead,
      });
      if (response.status === 404) {
        throw new Error('Status code: 404. Message: search job not found or expired');
      }
      const body = isRecord(response.data) ? response.data : {};
      return {
        done: body.done === true,
        events: Array.isArray(body.events) ? body.events : [],
        ...(body.metaData !== undefined ? { metaData: body.metaData } : {}),
      };
    },
  },
  stopNgSiemSearch: {
    isTool: true,
    scope: 'destroy',
    description:
      'Cancel a Next-Gen SIEM search. Returns outcome requested, or notFound when Falcon no longer has the search.',
    input: StopNgSiemSearchInputSchema,
    handler: async (ctx, input: StopNgSiemSearchInput) => {
      const response = await falconRequest<unknown>(ctx, {
        method: 'DELETE',
        path: ngSiemJobPath(input.id),
        // Stopping is idempotent in effect, so 5xx is retried.
        retryServerErrors: true,
        allowNotFound: true,
        textErrors: true,
        scope: SCOPES.ngsiemRead,
      });
      const stopped = response.status !== 404;
      return {
        stopped,
        id: input.id,
        outcomes: [{ id: input.id, status: stopped ? 'requested' : 'notFound' }],
      };
    },
  },
};
