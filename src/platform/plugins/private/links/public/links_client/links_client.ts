/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DeleteResult, SearchQuery } from '@kbn/content-management-plugin/common';
import { buildPath } from '@kbn/core-http-browser';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/common';
import type {
  SerializableAttributes,
  VisualizationClient,
} from '@kbn/visualizations-plugin/public';

import type { CONTENT_ID } from '../../common';
import { LINKS_API_PATH, LINKS_API_VERSION, LINKS_SAVED_OBJECT_TYPE } from '../../common/constants';
import type { LinksCreateRequestBody, LinksCreateResponseBody } from '../../server/api/create';
import type { LinksReadResponseBody } from '../../server/api/read';
import type { LinksSearchRequestQuery, LinksSearchResponseBody } from '../../server/api/search';
import type { LinksUpdateRequestBody, LinksUpdateResponseBody } from '../../server/api/update';
import { coreServices } from '../services/kibana_services';

export const linksClient = {
  get: async (id: string): Promise<LinksReadResponseBody> => {
    return await coreServices.http
      .get<LinksReadResponseBody>(buildPath(`${LINKS_API_PATH}/{id}`, { id }), {
        version: LINKS_API_VERSION,
      })
      .catch((e) => {
        if (e.response?.status === 404) {
          throw new SavedObjectNotFound({ type: LINKS_SAVED_OBJECT_TYPE, id });
        }
        const message = (e.body as { message?: string })?.message ?? e.message;
        throw new Error(message);
      });
  },
  create: async (request: LinksCreateRequestBody) => {
    return coreServices.http.post<LinksCreateResponseBody>(LINKS_API_PATH, {
      version: LINKS_API_VERSION,
      body: JSON.stringify(request),
    });
  },
  update: async (id: string, request: LinksUpdateRequestBody) => {
    const updateResponse = await coreServices.http.put<LinksUpdateResponseBody>(
      buildPath(`${LINKS_API_PATH}/{id}`, { id }),
      {
        version: LINKS_API_VERSION,
        body: JSON.stringify(request),
      }
    );
    return updateResponse;
  },
  delete: async (id: string): Promise<DeleteResult> => {
    return coreServices.http.delete(buildPath(`${LINKS_API_PATH}/{id}`, { id }), {
      version: LINKS_API_VERSION,
    });
  },
  search: async (searchQuery: LinksSearchRequestQuery) => {
    const { query, ...params } = searchQuery;
    return await coreServices.http.get<LinksSearchResponseBody>(LINKS_API_PATH, {
      version: LINKS_API_VERSION,
      query: {
        ...params,
        ...(query ? { query: `${query}*` } : {}),
      },
    });
  },
};

export function getLinksClient<
  Attr extends SerializableAttributes = SerializableAttributes
>(): VisualizationClient<typeof CONTENT_ID, Attr> {
  return {
    ...linksClient,
    search: async (searchQuery: SearchQuery) => {
      if ((searchQuery.tags?.included ?? []).length) return { hits: [], pagination: { total: 0 } };

      const result = await linksClient.search({
        query: searchQuery.text,
        per_page: searchQuery.limit,
      });
      return {
        hits: result.data.map(({ id, data, meta }) => {
          const { updated_at, updated_by, created_at, created_by, ...rest } = meta;
          return {
            type: LINKS_SAVED_OBJECT_TYPE,
            id,
            attributes: data,
            updatedAt: updated_at,
            updatedBy: updated_by,
            createdAt: created_at,
            createdBy: created_by,
            ...rest,
            references: [],
          };
        }),
        pagination: result.meta,
      };
    },
  } as unknown as VisualizationClient<typeof CONTENT_ID, Attr>;
}
