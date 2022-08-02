/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginServices } from '@kbn/presentation-util-plugin/public';
import { ControlsDataViewsService } from './data_views';
import { ControlsOverlaysService } from './overlays';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { registry as stubRegistry } from './stub';
import { ControlsPluginStart } from '../types';
import { ControlsDataService } from './data';
import { ControlsUnifiedSearchService } from './unified_search';
import { ControlsService } from './controls';
import { ControlsHTTPService } from './http';
import { ControlsOptionsListService } from './options_list';
import { ControlsSettingsService } from './settings';
import { ControlsThemeService } from './theme';

export interface ControlsServices {
  // dependency services
  dataViews: ControlsDataViewsService;
  overlays: ControlsOverlaysService;
  data: ControlsDataService;
  unifiedSearch: ControlsUnifiedSearchService;
  http: ControlsHTTPService;
  settings: ControlsSettingsService;
  theme: ControlsThemeService;

  // controls plugin's own services
  controls: ControlsService;
  optionsList: ControlsOptionsListService;
}

export const pluginServices = new PluginServices<ControlsServices>();

export const getStubPluginServices = (): ControlsPluginStart => {
  pluginServices.setRegistry(stubRegistry.start({}));
  return {
    getControlFactory: pluginServices.getServices().controls.getControlFactory,
    getControlTypes: pluginServices.getServices().controls.getControlTypes,
  };
};
