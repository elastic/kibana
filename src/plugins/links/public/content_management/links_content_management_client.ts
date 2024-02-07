/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SearchQuery } from '@kbn/content-management-plugin/common';
import { SerializableAttributes, VisualizationClient } from '@kbn/visualizations-plugin/public';
import { CONTENT_ID as contentTypeId, CONTENT_ID } from '../../common';
import type { LinksCrudTypes } from '../../common/content_management';
import { contentManagement } from '../services/kibana_services';

const get = async (id: string) => {
  return contentManagement.client.get<LinksCrudTypes['GetIn'], LinksCrudTypes['GetOut']>({
    contentTypeId,
    id,
  });
};

const create = async ({ data, options }: Omit<LinksCrudTypes['CreateIn'], 'contentTypeId'>) => {
  const res = await contentManagement.client.create<
    LinksCrudTypes['CreateIn'],
    LinksCrudTypes['CreateOut']
  >({
    contentTypeId,
    data,
    options,
  });
  return res;
};

const update = async ({ id, data, options }: Omit<LinksCrudTypes['UpdateIn'], 'contentTypeId'>) => {
  const res = await contentManagement.client.update<
    LinksCrudTypes['UpdateIn'],
    LinksCrudTypes['UpdateOut']
  >({
    contentTypeId,
    id,
    data,
    options,
  });
  return res;
};

const deleteLinks = async (id: string) => {
  await contentManagement.client.delete<LinksCrudTypes['DeleteIn'], LinksCrudTypes['DeleteOut']>({
    contentTypeId,
    id,
  });
};

const search = async (query: SearchQuery = {}, options?: LinksCrudTypes['SearchOptions']) => {
  return contentManagement.client.search<LinksCrudTypes['SearchIn'], LinksCrudTypes['SearchOut']>({
    contentTypeId,
    query,
    options,
  });
};

export const linksClient = {
  get,
  create,
  update,
  delete: deleteLinks,
  search,
};

export function getLinksClient<
  Attr extends SerializableAttributes = SerializableAttributes
>(): VisualizationClient<typeof CONTENT_ID, Attr> {
  return linksClient as unknown as VisualizationClient<typeof CONTENT_ID, Attr>;
}
