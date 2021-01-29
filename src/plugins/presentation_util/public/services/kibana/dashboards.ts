/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { DashboardSavedObject } from 'src/plugins/dashboard/public';

import { PresentationUtilPluginStartDeps } from '../../types';
import { KibanaPluginServiceFactory } from '../create';
import { PresentationDashboardsService } from '..';

export type DashboardsServiceFactory = KibanaPluginServiceFactory<
  PresentationDashboardsService,
  PresentationUtilPluginStartDeps
>;

export const dashboardsServiceFactory: DashboardsServiceFactory = ({ coreStart }) => {
  const findDashboards = async (query: string = '', fields: string[] = []) => {
    const { find } = coreStart.savedObjects.client;

    const { savedObjects } = await find<DashboardSavedObject>({
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
