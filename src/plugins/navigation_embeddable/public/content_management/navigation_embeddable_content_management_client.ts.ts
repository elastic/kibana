/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SearchQuery } from '@kbn/content-management-plugin/common';
import type { NavigationEmbeddableCrudTypes } from '../../common/content_management';
import { CONTENT_ID as contentTypeId } from '../../common';
import { contentManagement } from '../services/kibana_services';

const get = async (id: string) => {
  return contentManagement.client.get({ contentTypeId, id });
};

const create = async ({
  data,
  options,
}: Omit<NavigationEmbeddableCrudTypes['CreateIn'], 'contentTypeId'>) => {
  const res = await contentManagement.client.create<
    NavigationEmbeddableCrudTypes['CreateIn'],
    NavigationEmbeddableCrudTypes['CreateOut']
  >({
    contentTypeId,
    data,
    options,
  });
  return res;
};

const update = async ({
  id,
  data,
  options,
}: Omit<NavigationEmbeddableCrudTypes['UpdateIn'], 'contentTypeId'>) => {
  const res = await contentManagement.client.update<
    NavigationEmbeddableCrudTypes['UpdateIn'],
    NavigationEmbeddableCrudTypes['UpdateOut']
  >({
    contentTypeId,
    id,
    data,
    options,
  });
  return res;
};

const deleteNavigationEmbeddable = async (id: string) => {
  await contentManagement.client.delete<
    NavigationEmbeddableCrudTypes['DeleteIn'],
    NavigationEmbeddableCrudTypes['DeleteOut']
  >({
    contentTypeId,
    id,
  });
};

const search = async (
  query: SearchQuery = {},
  options?: NavigationEmbeddableCrudTypes['SearchOptions']
) => {
  return contentManagement.client.search<
    NavigationEmbeddableCrudTypes['SearchIn'],
    NavigationEmbeddableCrudTypes['SearchOut']
  >({
    contentTypeId,
    query,
    options,
  });
};

export const navigationEmbeddableClient = {
  get,
  create,
  update,
  delete: deleteNavigationEmbeddable,
  search,
};
