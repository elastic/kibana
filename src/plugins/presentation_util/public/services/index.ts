/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { PresentationUtilPluginStart } from '../types';
import type { PresentationCapabilitiesService } from './capabilities';
import { PluginServices } from './create';
import type { PresentationDashboardsService } from './dashboards';
import type { PresentationLabsService } from './labs';
import { registry as stubRegistry } from './stub';

export { PresentationCapabilitiesService } from './capabilities';
export { PresentationDashboardsService } from './dashboards';
export { PresentationLabsService } from './labs';
export interface PresentationUtilServices {
  dashboards: PresentationDashboardsService;
  capabilities: PresentationCapabilitiesService;
  labs: PresentationLabsService;
}

export const pluginServices = new PluginServices<PresentationUtilServices>();

export const getStubPluginServices = (): PresentationUtilPluginStart => {
  pluginServices.setRegistry(stubRegistry.start({}));
  return {
    ContextProvider: pluginServices.getContextProvider(),
    labsService: pluginServices.getServices().labs,
  };
};
