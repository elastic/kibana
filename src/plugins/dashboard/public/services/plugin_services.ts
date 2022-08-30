/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  PluginServiceProviders,
  KibanaPluginServiceParams,
  PluginServiceProvider,
  PluginServiceRegistry,
  PluginServices,
} from '@kbn/presentation-util-plugin/public';

import { DashboardServices } from './types';
import { DashboardStartDependencies } from '../plugin';

import { chromeServiceFactory } from './chrome/chrome_service';
import { dashboardCapabilitiesServiceFactory } from './dashboard_capabilities/dashboard_capabilities_service';
import { dataServiceFactory } from './data/data_service';
import { dataViewEditorServiceFactory } from './data_view_editor/data_view_editor_service';
import { embeddableServiceFactory } from './embeddable/embeddable_service';
import { httpServiceFactory } from './http/http_service';
import { navigationServiceFactory } from './navigation/navigation_service';
import { notificationsServiceFactory } from './notifications/notifications_service';
import { overlaysServiceFactory } from './overlays/overlays_service';
import { screenshotModeServiceFactory } from './screenshot_mode/screenshot_mode_service';
import { settingsServiceFactory } from './settings/settings_service';
import { spacesServiceFactory } from './spaces/spaces_service';
import { urlForwardingServiceFactory } from './url_forwarding/url_forwarding_service';
import { visualizationsServiceFactory } from './visualizations/visualizations_service';

const providers: PluginServiceProviders<
  DashboardServices,
  KibanaPluginServiceParams<DashboardStartDependencies>
> = {
  chrome: new PluginServiceProvider(chromeServiceFactory),
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
  urlForwarding: new PluginServiceProvider(urlForwardingServiceFactory),
  visualizations: new PluginServiceProvider(visualizationsServiceFactory),

  dashboardCapabilities: new PluginServiceProvider(dashboardCapabilitiesServiceFactory),
};

export const pluginServices = new PluginServices<DashboardServices>();

export const registry = new PluginServiceRegistry<
  DashboardServices,
  KibanaPluginServiceParams<DashboardStartDependencies>
>(providers);
