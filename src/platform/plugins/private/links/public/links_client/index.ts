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
import type {
  SerializableAttributes,
  VisualizationClient,
} from '@kbn/visualizations-plugin/public';

import { LINKS_API_PATH, LINKS_LIBRARY_TYPE, PUBLIC_API_VERSION } from '../../common/constants';
import type { LinksCreateRequestBody, LinksCreateResponseBody } from '../../server/api/create';
import type { LinksReadResponseBody } from '../../server/api/read';
import type { LinksSearchRequestQuery, LinksSearchResponseBody } from '../../server/api/search';
import type { LinksUpdateRequestBody, LinksUpdateResponseBody } from '../../server/api/update';
import { coreServices } from '../services/kibana_services';
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
  search: async (searchQuery: LinksSearchRequestQuery) => {
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

export function getLinksClient<
  Attr extends SerializableAttributes = SerializableAttributes
>(): VisualizationClient<typeof LINKS_LIBRARY_TYPE, Attr> {
  return linksClient as unknown as VisualizationClient<typeof LINKS_LIBRARY_TYPE, Attr>;
}
