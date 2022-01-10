/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PresentationUtilPluginStart } from '../types';
import { PluginServices } from './create';
import { PresentationCapabilitiesService } from './capabilities';
import { PresentationDashboardsService } from './dashboards';
import { PresentationLabsService } from './labs';
import { registry as stubRegistry } from './stub';
import { PresentationDataViewsService } from './data_views';
import { registerExpressionsLanguage } from '..';

export type { PresentationCapabilitiesService } from './capabilities';
export type { PresentationDashboardsService } from './dashboards';
export type { PresentationLabsService } from './labs';

export interface PresentationUtilServices {
  dashboards: PresentationDashboardsService;
  dataViews: PresentationDataViewsService;
  capabilities: PresentationCapabilitiesService;
  labs: PresentationLabsService;
}

export const pluginServices = new PluginServices<PresentationUtilServices>();

export const getStubPluginServices = (): PresentationUtilPluginStart => {
  pluginServices.setRegistry(stubRegistry.start({}));
  return {
    ContextProvider: pluginServices.getContextProvider(),
    labsService: pluginServices.getServices().labs,
    registerExpressionsLanguage,
  };
};
