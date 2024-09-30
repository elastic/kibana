/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import type { DashboardStartDependencies } from '../../plugin';
import type { DashboardDataService } from './types';

export type DataServiceFactory = KibanaPluginServiceFactory<
  DashboardDataService,
  DashboardStartDependencies
>;

export const dataServiceFactory: DataServiceFactory = ({ startPlugins }) => {
  const {
    data: { dataViews, fieldFormats, query, search },
  } = startPlugins;

  return {
    dataViews,
    fieldFormats,
    query,
    search,
  };
};
