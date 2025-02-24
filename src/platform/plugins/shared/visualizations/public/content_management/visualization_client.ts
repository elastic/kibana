/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SearchQuery } from '@kbn/content-management-plugin/common';
import type {
  VisualizationGetIn,
  VisualizationGetOut,
  VisualizationCreateIn,
  VisualizationCreateOut,
  VisualizationUpdateIn,
  VisualizationUpdateOut,
  VisualizationDeleteIn,
  VisualizationDeleteOut,
  VisualizationSearchIn,
  VisualizationSearchOut,
  VisualizationSearchQuery,
} from '../../common/content_management';
import { getContentManagement } from '../services';

const get = async (id: string) => {
  return getContentManagement().client.get<VisualizationGetIn, VisualizationGetOut>({
    contentTypeId: 'visualization',
    id,
  });
};

const create = async ({ data, options }: Omit<VisualizationCreateIn, 'contentTypeId'>) => {
  const res = await getContentManagement().client.create<
    VisualizationCreateIn,
    VisualizationCreateOut
  >({
    contentTypeId: 'visualization',
    data,
    options,
  });
  return res;
};

const update = async ({ id, data, options }: Omit<VisualizationUpdateIn, 'contentTypeId'>) => {
  const res = await getContentManagement().client.update<
    VisualizationUpdateIn,
    VisualizationUpdateOut
  >({
    contentTypeId: 'visualization',
    id,
    data,
    options,
  });
  return res;
};

const deleteVisualization = async (id: string) => {
  const res = await getContentManagement().client.delete<
    VisualizationDeleteIn,
    VisualizationDeleteOut
  >({
    contentTypeId: 'visualization',
    id,
  });
  return res;
};

const search = async (query: SearchQuery = {}, options?: VisualizationSearchQuery) => {
  if (options && options.types && options.types.length > 1) {
    const { types } = options;
    return getContentManagement().client.mSearch<VisualizationSearchOut['hits'][number]>({
      contentTypes: types.map((type) => ({ contentTypeId: type })),
      query,
    });
  }
  return getContentManagement().client.search<VisualizationSearchIn, VisualizationSearchOut>({
    contentTypeId: 'visualization',
    query,
    options,
  });
};

export const visualizationsClient = {
  get,
  create,
  update,
  delete: deleteVisualization,
  search,
};
