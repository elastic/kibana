/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import { toAsCodeTags, toStoredTags } from '@kbn/as-code-shared-transforms';
import type { BasicVisualizationClient } from '@kbn/visualizations-plugin/public';
import { VEGA_API_PATH, VEGA_API_VERSION, VEGA_SAVED_OBJECT_TYPE } from '../../common/constants';
import type {
  VegaCreateRequestBody,
  VegaCreateResponseBody,
  VegaReadResponseBody,
  VegaSearchRequestQuery,
  VegaSearchResponseBody,
  VegaUpdateRequestBody,
  VegaUpdateResponseBody,
} from '../../server';

/** The details and spec of a library item as the API returns them, minus the tags. */
export type VegaLibraryAttributes = Omit<VegaReadResponseBody['data'], 'tags'>;

const getItemPath = (id: string) => `${VEGA_API_PATH}/${encodeURIComponent(id)}`;

export const createVegaLibraryClient = (http: HttpStart) => ({
  create: (item: VegaCreateRequestBody) =>
    http.post<VegaCreateResponseBody>(VEGA_API_PATH, {
      version: VEGA_API_VERSION,
      body: JSON.stringify(item),
    }),
  get: (id: string) =>
    http
      .get<VegaReadResponseBody>(getItemPath(id), { version: VEGA_API_VERSION })
      .catch((error) => {
        if (error.response?.status === 404) {
          throw new SavedObjectNotFound({ type: VEGA_SAVED_OBJECT_TYPE, id });
        }
        throw new Error((error.body as { message?: string })?.message ?? error.message);
      }),
  update: (id: string, item: VegaUpdateRequestBody) =>
    http.put<VegaUpdateResponseBody>(getItemPath(id), {
      version: VEGA_API_VERSION,
      body: JSON.stringify(item),
    }),
  delete: async (id: string) => {
    await http.delete(getItemPath(id), { version: VEGA_API_VERSION });
    return { success: true };
  },
  search: (query: VegaSearchRequestQuery) =>
    http.get<VegaSearchResponseBody>(VEGA_API_PATH, { version: VEGA_API_VERSION, query }),
});

export type VegaLibraryClient = ReturnType<typeof createVegaLibraryClient>;

/** Whether another library item already uses `title`, ignoring case. */
export const hasVegaLibraryItemWithTitle = async (client: VegaLibraryClient, title: string) => {
  const { data } = await client.search({ query: `"${title}"` });
  return data.some((item) => item.data.title.toLowerCase() === title.toLowerCase());
};

/**
 * Adapts the library API to the client the Visualize listing uses to edit details (title,
 * description and tags) and to delete items. Tags travel as saved object references there and as
 * a `tags` array in the API.
 */
export const getVegaVisualizationClient = (
  http: HttpStart
): BasicVisualizationClient<typeof VEGA_SAVED_OBJECT_TYPE, VegaLibraryAttributes> => {
  const client = createVegaLibraryClient(http);

  return {
    get: async (id) => {
      const { data, meta } = await client.get(id);
      const { state: attributes, references } = toStoredTags(data);
      return {
        item: {
          id,
          type: VEGA_SAVED_OBJECT_TYPE,
          ...meta,
          attributes,
          references,
        },
        meta: { outcome: 'exactMatch' },
      };
    },
    // The API replaces the whole item, so merge the changes into the stored one first.
    update: async ({ id, data, options }) => {
      const original = await client.get(id);
      const { data: updated } = await client.update(id, {
        ...original.data,
        ...data,
        ...toAsCodeTags(options?.references),
      });
      const { state: attributes, references } = toStoredTags(updated);
      return {
        item: { id, type: VEGA_SAVED_OBJECT_TYPE, attributes, references },
      };
    },
    delete: client.delete,
  };
};
