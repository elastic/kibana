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

import { analyticsServiceFactory } from './analytics/analytics.stub';
import { applicationServiceFactory } from './application/application.stub';
import { chromeServiceFactory } from './chrome/chrome.stub';
import { coreContextServiceFactory } from './core_context/core_context.stub';
import { dashboardCapabilitiesServiceFactory } from './dashboard_capabilities/dashboard_capabilities.stub';
import { dashboardSessionStorageServiceFactory } from './dashboard_session_storage/dashboard_session_storage.stub';
import { dataServiceFactory } from './data/data.stub';
import { dataViewEditorServiceFactory } from './data_view_editor/data_view_editor.stub';
import { documentationLinksServiceFactory } from './documentation_links/documentation_links.stub';
import { embeddableServiceFactory } from './embeddable/embeddable.stub';
import { httpServiceFactory } from './http/http.stub';
import { initializerContextServiceFactory } from './initializer_context/initializer_context.stub';
import { navigationServiceFactory } from './navigation/navigation.stub';
import { notificationsServiceFactory } from './notifications/notifications.stub';
import { overlaysServiceFactory } from './overlays/overlays.stub';
import { savedObjectsTaggingServiceFactory } from './saved_objects_tagging/saved_objects_tagging.stub';
import { screenshotModeServiceFactory } from './screenshot_mode/screenshot_mode.stub';
import { settingsServiceFactory } from './settings/settings.stub';
import { shareServiceFactory } from './share/share.stub';
import { usageCollectionServiceFactory } from './usage_collection/usage_collection.stub';
import { spacesServiceFactory } from './spaces/spaces.stub';
import { urlForwardingServiceFactory } from './url_forwarding/url_fowarding.stub';
import { visualizationsServiceFactory } from './visualizations/visualizations.stub';
import { dashboardSavedObjectServiceFactory } from './dashboard_saved_object/dashboard_saved_object.stub';

export const providers: PluginServiceProviders<DashboardServices> = {
  dashboardSavedObject: new PluginServiceProvider(dashboardSavedObjectServiceFactory),
  analytics: new PluginServiceProvider(analyticsServiceFactory),
  application: new PluginServiceProvider(applicationServiceFactory),
  chrome: new PluginServiceProvider(chromeServiceFactory),
  coreContext: new PluginServiceProvider(coreContextServiceFactory),
  dashboardCapabilities: new PluginServiceProvider(dashboardCapabilitiesServiceFactory),
  dashboardSessionStorage: new PluginServiceProvider(dashboardSessionStorageServiceFactory),
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

export const registry = new PluginServiceRegistry<DashboardServices>(providers);
