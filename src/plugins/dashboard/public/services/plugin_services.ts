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
  PluginServices,
} from '@kbn/presentation-util-plugin/public';

import { DashboardPluginServiceParams, DashboardServices } from './types';

import { applicationServiceFactory } from './application/application_service';
import { chromeServiceFactory } from './chrome/chrome_service';
import { coreContextServiceFactory } from './core_context/core_context_service';
import { dashboardCapabilitiesServiceFactory } from './dashboard_capabilities/dashboard_capabilities_service';
import { dashboardSessionStorageServiceFactory } from './dashboard_session_storage/dashboard_session_storage_service';
import { dataServiceFactory } from './data/data_service';
import { dataViewEditorServiceFactory } from './data_view_editor/data_view_editor_service';
import { documentationLinksServiceFactory } from './documentation_links/documentation_links_service';
import { embeddableServiceFactory } from './embeddable/embeddable_service';
import { httpServiceFactory } from './http/http_service';
import { initializerContextServiceFactory } from './initializer_context/initializer_context_service';
import { navigationServiceFactory } from './navigation/navigation_service';
import { notificationsServiceFactory } from './notifications/notifications_service';
import { overlaysServiceFactory } from './overlays/overlays_service';
import { screenshotModeServiceFactory } from './screenshot_mode/screenshot_mode_service';
import { savedObjectsTaggingServiceFactory } from './saved_objects_tagging/saved_objects_tagging_service';
import { settingsServiceFactory } from './settings/settings_service';
import { shareServiceFactory } from './share/share_services';
import { spacesServiceFactory } from './spaces/spaces_service';
import { urlForwardingServiceFactory } from './url_forwarding/url_forwarding_service';
import { visualizationsServiceFactory } from './visualizations/visualizations_service';
import { usageCollectionServiceFactory } from './usage_collection/usage_collection_service';
import { analyticsServiceFactory } from './analytics/analytics_service';
import { dashboardSavedObjectServiceFactory } from './dashboard_saved_object/dashboard_saved_object_service';

const providers: PluginServiceProviders<DashboardServices, DashboardPluginServiceParams> = {
  dashboardSavedObject: new PluginServiceProvider(dashboardSavedObjectServiceFactory, [
    'dashboardSessionStorage',
    'savedObjectsTagging',
    'initializerContext',
    'screenshotMode',
    'notifications',
    'embeddable',
    'spaces',
    'data',
  ]),
  dashboardSessionStorage: new PluginServiceProvider(dashboardSessionStorageServiceFactory, [
    'notifications',
    'spaces',
  ]),

  analytics: new PluginServiceProvider(analyticsServiceFactory),
  application: new PluginServiceProvider(applicationServiceFactory),
  chrome: new PluginServiceProvider(chromeServiceFactory),
  coreContext: new PluginServiceProvider(coreContextServiceFactory),
  dashboardCapabilities: new PluginServiceProvider(dashboardCapabilitiesServiceFactory),
  data: new PluginServiceProvider(dataServiceFactory),
  dataViewEditor: new PluginServiceProvider(dataViewEditorServiceFactory),
  documentationLinks: new PluginServiceProvider(documentationLinksServiceFactory),
  embeddable: new PluginServiceProvider(embeddableServiceFactory),
  http: new PluginServiceProvider(httpServiceFactory),
  initializerContext: new PluginServiceProvider(initializerContextServiceFactory),
  navigation: new PluginServiceProvider(navigationServiceFactory),
  notifications: new PluginServiceProvider(notificationsServiceFactory),
  overlays: new PluginServiceProvider(overlaysServiceFactory),
  savedObjectsTagging: new PluginServiceProvider(savedObjectsTaggingServiceFactory),
  screenshotMode: new PluginServiceProvider(screenshotModeServiceFactory),
  settings: new PluginServiceProvider(settingsServiceFactory),
  share: new PluginServiceProvider(shareServiceFactory),
  spaces: new PluginServiceProvider(spacesServiceFactory),
  urlForwarding: new PluginServiceProvider(urlForwardingServiceFactory),
  usageCollection: new PluginServiceProvider(usageCollectionServiceFactory),
  visualizations: new PluginServiceProvider(visualizationsServiceFactory),
};

export const pluginServices = new PluginServices<DashboardServices>();

export const registry = new PluginServiceRegistry<DashboardServices, DashboardPluginServiceParams>(
  providers
);
