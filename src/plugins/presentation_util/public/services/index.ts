/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginServices } from './create';
import { PresentationCapabilitiesService } from './capabilities';
import { PresentationDashboardsService } from './dashboards';
import { PresentationLabsService } from './labs';

export { PresentationCapabilitiesService } from './capabilities';
export { PresentationDashboardsService } from './dashboards';
export { PresentationLabsService } from './labs';
export interface PresentationUtilServices {
  dashboards: PresentationDashboardsService;
  capabilities: PresentationCapabilitiesService;
  labs: PresentationLabsService;
}

export const pluginServices = new PluginServices<PresentationUtilServices>();
