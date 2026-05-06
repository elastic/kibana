/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SearchQuery } from '@kbn/content-management-plugin/common';
import type {
  SerializableAttributes,
  VisualizationClient,
} from '@kbn/visualizations-plugin/public';
import { CONTENT_ID } from '../../common';
import type { LinksCrudTypes } from '../../common/content_management';
import { contentManagement, coreServices } from '../services/kibana_services';
import type { LinksCreateRequestBody, LinksCreateResponseBody } from '../../server/api/create';
import { LINKS_API_PATH, LINKS_API_VERSION } from '../../common/constants';

const get = async (id: string) => {
  return contentManagement.client.get<LinksCrudTypes['GetIn'], LinksCrudTypes['GetOut']>({
    contentTypeId: CONTENT_ID,
    id,
  });
};

const update = async ({ id, data, options }: Omit<LinksCrudTypes['UpdateIn'], 'contentTypeId'>) => {
  const res = await contentManagement.client.update<
    LinksCrudTypes['UpdateIn'],
    LinksCrudTypes['UpdateOut']
  >({
    contentTypeId: CONTENT_ID,
    id,
    data,
    options,
  });
  return res;
};

const deleteLinks = async (id: string) => {
  await contentManagement.client.delete<LinksCrudTypes['DeleteIn'], LinksCrudTypes['DeleteOut']>({
    contentTypeId: CONTENT_ID,
    id,
  });
};

const search = async (query: SearchQuery = {}, options?: LinksCrudTypes['SearchOptions']) => {
  return contentManagement.client.search<LinksCrudTypes['SearchIn'], LinksCrudTypes['SearchOut']>({
    contentTypeId: CONTENT_ID,
    query,
    options,
  });
};

export const linksClient = {
  get,
  create: async (request: LinksCreateRequestBody) => {
    return coreServices.http.post<LinksCreateResponseBody>(LINKS_API_PATH, {
      version: LINKS_API_VERSION,
      body: JSON.stringify(request),
    });
  },
  update,
  delete: deleteLinks,
  search,
};

export function getLinksClient<
  Attr extends SerializableAttributes = SerializableAttributes
>(): VisualizationClient<typeof CONTENT_ID, Attr> {
  return linksClient as unknown as VisualizationClient<typeof CONTENT_ID, Attr>;
}
