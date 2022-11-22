/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PresentationUtilPluginStartDeps } from '../../types';
import { KibanaPluginServiceFactory } from '../create';
import type { PresentationDashboardsService } from './types';

export type DashboardsServiceFactory = KibanaPluginServiceFactory<
  PresentationDashboardsService,
  PresentationUtilPluginStartDeps
>;

export interface PartialDashboardAttributes {
  title: string;
}
export const dashboardsServiceFactory: DashboardsServiceFactory = ({ coreStart }) => {
  const findDashboards = async (query: string = '', fields: string[] = []) => {
    const { find } = coreStart.savedObjects.client;

    const { savedObjects } = await find<PartialDashboardAttributes>({
      type: 'dashboard',
      search: `${query}*`,
      searchFields: fields,
    });

    return savedObjects;
  };

  const findDashboardsByTitle = async (title: string = '') => findDashboards(title, ['title']);

  return {
    findDashboards,
    findDashboardsByTitle,
  };
};
