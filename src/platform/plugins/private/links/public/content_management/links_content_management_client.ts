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

import { CONTENT_ID } from '../../common';
import { LINKS_API_PATH, LINKS_API_VERSION, LINKS_SAVED_OBJECT_TYPE } from '../../common/constants';
import type { LinksCrudTypes } from '../../common/content_management';
import type { LinksCreateRequestBody, LinksCreateResponseBody } from '../../server/api/create';
import type { LinksReadResponseBody } from '../../server/api/read';
import type { LinksUpdateRequestBody, LinksUpdateResponseBody } from '../../server/api/update';
import { contentManagement, coreServices } from '../services/kibana_services';

const search = async (query: SearchQuery = {}, options?: LinksCrudTypes['SearchOptions']) => {
  return contentManagement.client.search<LinksCrudTypes['SearchIn'], LinksCrudTypes['SearchOut']>({
    contentTypeId: CONTENT_ID,
    query,
    options,
  });
};

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
  search,
};

export function getLinksClient<
  Attr extends SerializableAttributes = SerializableAttributes
>(): VisualizationClient<typeof CONTENT_ID, Attr> {
  return linksClient as unknown as VisualizationClient<typeof CONTENT_ID, Attr>;
}
