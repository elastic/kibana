/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  PluginServiceProviders,
  PluginServiceProvider,
  PluginServiceRegistry,
} from '@kbn/presentation-util-plugin/public';

import { DashboardServices } from './types';

import { chromeServiceFactory } from './chrome/chrome.stub';
import { dashboardCapabilitiesServiceFactory } from './dashboard_capabilities/dashboard_capabilities.stub';
import { dataServiceFactory } from './data/data.stub';
import { dataViewEditorServiceFactory } from './data_view_editor/data_view_editor.stub';
import { embeddableServiceFactory } from './embeddable/embeddable.stub';
import { httpServiceFactory } from './http/http.stub';
import { navigationServiceFactory } from './navigation/navigation.stub';
import { notificationsServiceFactory } from './notifications/notifications.stub';
import { overlaysServiceFactory } from './overlays/overlays.stub';
import { settingsServiceFactory } from './settings/settings.stub';
import { spacesServiceFactory } from './spaces/spaces.stub';
import { visualizationsServiceFactory } from './visualizations/visualizations.stub';
import { screenshotModeServiceFactory } from './screenshot_mode/screenshot_mode.stub';

export const providers: PluginServiceProviders<DashboardServices> = {
  chrome: new PluginServiceProvider(chromeServiceFactory),
  dashboardCapabilities: new PluginServiceProvider(dashboardCapabilitiesServiceFactory),
  data: new PluginServiceProvider(dataServiceFactory),
  dataViewEditor: new PluginServiceProvider(dataViewEditorServiceFactory),
  embeddable: new PluginServiceProvider(embeddableServiceFactory),
  http: new PluginServiceProvider(httpServiceFactory),
  navigation: new PluginServiceProvider(navigationServiceFactory),
  notifications: new PluginServiceProvider(notificationsServiceFactory),
  overlays: new PluginServiceProvider(overlaysServiceFactory),
  screenshotMode: new PluginServiceProvider(screenshotModeServiceFactory),
  settings: new PluginServiceProvider(settingsServiceFactory),
  spaces: new PluginServiceProvider(spacesServiceFactory),
  visualizations: new PluginServiceProvider(visualizationsServiceFactory),
};

export const registry = new PluginServiceRegistry<DashboardServices>(providers);
