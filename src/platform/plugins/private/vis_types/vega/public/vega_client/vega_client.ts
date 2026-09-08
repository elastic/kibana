/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildPath } from '@kbn/core-http-browser';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import type { DeleteResult } from '@kbn/content-management-plugin/common';
import type { VegaCreateRequestBody, VegaCreateResponseBody } from '../../server/api/create/types';
import type { VegaReadResponseBody } from '../../server/api/read/types';
import type { VegaSearchRequestQuery, VegaSearchResponseBody } from '../../server/api/search/types';
import type { VegaUpdateRequestBody, VegaUpdateResponseBody } from '../../server/api/update/types';
import { PUBLIC_API_VERSION, VEGA_API_PATH, VEGA_EMBEDDABLE_TYPE } from '../../common/constants';
import { getHttp } from '../services';

export const vegaClient = {
  create: (state: VegaCreateRequestBody) =>
    getHttp().post<VegaCreateResponseBody>(VEGA_API_PATH, {
      version: PUBLIC_API_VERSION,
      body: JSON.stringify(state),
    }),
  delete: (id: string): Promise<DeleteResult> =>
    getHttp().delete(buildPath(`${VEGA_API_PATH}/{id}`, { id }), { version: PUBLIC_API_VERSION }),
  get: async (id: string): Promise<VegaReadResponseBody> => {
    try {
      return await getHttp().get(buildPath(`${VEGA_API_PATH}/{id}`, { id }), {
        version: PUBLIC_API_VERSION,
      });
    } catch (error) {
      const httpError = error as {
        response?: { status?: number };
        body?: { message?: string };
        message?: string;
      };
      if (httpError.response?.status === 404) {
        throw new SavedObjectNotFound({ type: VEGA_EMBEDDABLE_TYPE, id });
      }
      throw new Error(httpError.body?.message ?? httpError.message ?? 'Failed to load Vega item');
    }
  },
  search: ({ query, ...params }: VegaSearchRequestQuery) =>
    getHttp().get<VegaSearchResponseBody>(VEGA_API_PATH, {
      version: PUBLIC_API_VERSION,
      query: { ...params, ...(query ? { query: `${query}*` } : {}) },
    }),
  update: (id: string, state: VegaUpdateRequestBody) =>
    getHttp().put<VegaUpdateResponseBody>(buildPath(`${VEGA_API_PATH}/{id}`, { id }), {
      version: PUBLIC_API_VERSION,
      body: JSON.stringify(state),
    }),
};
