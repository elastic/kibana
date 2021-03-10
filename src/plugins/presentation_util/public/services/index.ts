/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SimpleSavedObject } from 'src/core/public';
import { PluginServices } from './create';
import { PartialDashboardAttributes } from './kibana/dashboards';

export interface PresentationDashboardsService {
  findDashboards: (
    query: string,
    fields: string[]
  ) => Promise<Array<SimpleSavedObject<PartialDashboardAttributes>>>;
  findDashboardsByTitle: (
    title: string
  ) => Promise<Array<SimpleSavedObject<PartialDashboardAttributes>>>;
}

export interface PresentationCapabilitiesService {
  canAccessDashboards: () => boolean;
  canCreateNewDashboards: () => boolean;
}

export interface PresentationUtilServices {
  dashboards: PresentationDashboardsService;
  capabilities: PresentationCapabilitiesService;
}

export const pluginServices = new PluginServices<PresentationUtilServices>();
