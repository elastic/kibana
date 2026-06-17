/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DeleteResult } from '@kbn/content-management-plugin/common';
import { buildPath } from '@kbn/core-http-browser';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/common';
import type { VisualizationClient } from '@kbn/visualizations-plugin/public';

import { LINKS_API_PATH, LINKS_LIBRARY_TYPE, PUBLIC_API_VERSION } from '../../common/constants';
import type { LinksState } from '../../server';
import type { LinksCreateRequestBody, LinksCreateResponseBody } from '../../server/api/create';
import type { LinksReadResponseBody } from '../../server/api/read';
import type { LinksSearchRequestParams, LinksSearchResponseBody } from '../../server/api/search';
import type { LinksUpdateRequestBody, LinksUpdateResponseBody } from '../../server/api/update';
import { coreServices, savedObjectsTaggingService } from '../services/kibana_services';
export { hasLibraryItemWithTitle } from './has_library_item_with_title';
export { runSaveToLibrary } from './save_to_library';

export const linksClient = {
  get: async (id: string): Promise<LinksReadResponseBody> => {
    return await coreServices.http
      .get<LinksReadResponseBody>(buildPath(`${LINKS_API_PATH}/{id}`, { id }), {
        version: PUBLIC_API_VERSION,
      })
      .catch((e) => {
        if (e.response?.status === 404) {
          throw new SavedObjectNotFound({ type: LINKS_LIBRARY_TYPE, id });
        }
        const message = (e.body as { message?: string })?.message ?? e.message;
        throw new Error(message);
      });
  },
  create: async (request: LinksCreateRequestBody) => {
    return coreServices.http.post<LinksCreateResponseBody>(LINKS_API_PATH, {
      version: PUBLIC_API_VERSION,
      body: JSON.stringify(request),
    });
  },
  update: async (id: string, request: LinksUpdateRequestBody) => {
    return coreServices.http.put<LinksUpdateResponseBody>(
      buildPath(`${LINKS_API_PATH}/{id}`, { id }),
      {
        version: PUBLIC_API_VERSION,
        body: JSON.stringify(request),
      }
    );
  },
  delete: async (id: string): Promise<DeleteResult> => {
    return coreServices.http.delete(buildPath(`${LINKS_API_PATH}/{id}`, { id }), {
      version: PUBLIC_API_VERSION,
    });
  },
  search: async (searchQuery: LinksSearchRequestParams) => {
    const { query, ...params } = searchQuery;
    return await coreServices.http.get<LinksSearchResponseBody>(LINKS_API_PATH, {
      version: PUBLIC_API_VERSION,
      query: {
        ...params,
        ...(query ? { query: `${query}*` } : {}),
      },
    });
  },
};

export function getLinksClient<Attr extends LinksState = LinksState>(): VisualizationClient<
  typeof LINKS_LIBRARY_TYPE,
  Attr
> {
  return {
    get: async (id: string) => {
      const result = await linksClient.get(id);
      return {
        item: {
          id,
          type: LINKS_LIBRARY_TYPE,
          ...result.meta,
          attributes: result.data,
        },
        meta: { outcome: 'exactMatch' },
      };
    },
    create: async ({ data }) => {
      const result = await linksClient.create(data);
      return { item: { id: result.id, attributes: result.data } };
    },
    update: async ({ id, data, options }) => {
      let tags: string[] = [];
      if (savedObjectsTaggingService) {
        tags =
          savedObjectsTaggingService
            .getTaggingApi()
            ?.ui.getTagIdsFromReferences(options?.references ?? []) ?? [];
      }
      const original = await linksClient.get(id); // get the original library item so we can perform a full update
      const result = await linksClient.update(id, { ...original.data, ...data, tags });
      return { item: { id: result.id, attributes: result.data } };
    },
    delete: linksClient.delete,
    search: async ({ text: query }) => {
      const result = await linksClient.search({ query });
      return { pagination: { total: result.meta.total } };
    },
  } as VisualizationClient<typeof LINKS_LIBRARY_TYPE, Attr>;
}
