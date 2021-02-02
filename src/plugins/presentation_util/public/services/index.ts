/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SimpleSavedObject } from 'src/core/public';
import { DashboardSavedObject } from 'src/plugins/dashboard/public';
import { PluginServices } from './create';
export interface PresentationDashboardsService {
  findDashboards: (
    query: string,
    fields: string[]
  ) => Promise<Array<SimpleSavedObject<DashboardSavedObject>>>;
  findDashboardsByTitle: (title: string) => Promise<Array<SimpleSavedObject<DashboardSavedObject>>>;
}

export interface PresentationCapabilitiesService {
  canAccessDashboards: () => boolean;
  canCreateNewDashboards: () => boolean;
  canEditDashboards: () => boolean;
}

export interface PresentationUtilServices {
  dashboards: PresentationDashboardsService;
  capabilities: PresentationCapabilitiesService;
}

export const pluginServices = new PluginServices<PresentationUtilServices>();
