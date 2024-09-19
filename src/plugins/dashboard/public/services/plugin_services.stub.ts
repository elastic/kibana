/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
import { dashboardBackupServiceFactory } from './dashboard_backup/dashboard_backup.stub';
import { dataServiceFactory } from './data/data.stub';
import { dataViewEditorServiceFactory } from './data_view_editor/data_view_editor.stub';
import { documentationLinksServiceFactory } from './documentation_links/documentation_links.stub';
import { embeddableServiceFactory } from './embeddable/embeddable.stub';
import { httpServiceFactory } from './http/http.stub';
import { i18nServiceFactory } from './i18n/i18n.stub';
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
import { dashboardContentManagementServiceFactory } from './dashboard_content_management/dashboard_content_management.stub';
import { customBrandingServiceFactory } from './custom_branding/custom_branding.stub';
import { savedObjectsManagementServiceFactory } from './saved_objects_management/saved_objects_management_service.stub';
import { contentManagementServiceFactory } from './content_management/content_management_service.stub';
import { serverlessServiceFactory } from './serverless/serverless_service.stub';
import { userProfileServiceFactory } from './user_profile/user_profile_service.stub';
import { observabilityAIAssistantServiceStubFactory } from './observability_ai_assistant/observability_ai_assistant_service.stub';
import { noDataPageServiceFactory } from './no_data_page/no_data_page_service.stub';
import { uiActionsServiceFactory } from './ui_actions/ui_actions_service.stub';
import { dashboardRecentlyAccessedServiceFactory } from './dashboard_recently_accessed/dashboard_recently_accessed.stub';
import { dashboardFavoritesServiceFactory } from './dashboard_favorites/dashboard_favorites_service.stub';
import { dashboardContentInsightsServiceFactory } from './dashboard_content_insights/dashboard_content_insights.stub';

export const providers: PluginServiceProviders<DashboardServices> = {
  dashboardContentManagement: new PluginServiceProvider(dashboardContentManagementServiceFactory),
  analytics: new PluginServiceProvider(analyticsServiceFactory),
  application: new PluginServiceProvider(applicationServiceFactory),
  chrome: new PluginServiceProvider(chromeServiceFactory),
  coreContext: new PluginServiceProvider(coreContextServiceFactory),
  dashboardCapabilities: new PluginServiceProvider(dashboardCapabilitiesServiceFactory),
  dashboardBackup: new PluginServiceProvider(dashboardBackupServiceFactory),
  data: new PluginServiceProvider(dataServiceFactory),
  dataViewEditor: new PluginServiceProvider(dataViewEditorServiceFactory),
  documentationLinks: new PluginServiceProvider(documentationLinksServiceFactory),
  embeddable: new PluginServiceProvider(embeddableServiceFactory),
  http: new PluginServiceProvider(httpServiceFactory),
  i18n: new PluginServiceProvider(i18nServiceFactory),
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
  customBranding: new PluginServiceProvider(customBrandingServiceFactory),
  savedObjectsManagement: new PluginServiceProvider(savedObjectsManagementServiceFactory),
  contentManagement: new PluginServiceProvider(contentManagementServiceFactory),
  serverless: new PluginServiceProvider(serverlessServiceFactory),
  noDataPage: new PluginServiceProvider(noDataPageServiceFactory),
  uiActions: new PluginServiceProvider(uiActionsServiceFactory),
  userProfile: new PluginServiceProvider(userProfileServiceFactory),
  observabilityAIAssistant: new PluginServiceProvider(observabilityAIAssistantServiceStubFactory),
  dashboardRecentlyAccessed: new PluginServiceProvider(dashboardRecentlyAccessedServiceFactory),
  dashboardContentInsights: new PluginServiceProvider(dashboardContentInsightsServiceFactory),
  dashboardFavorites: new PluginServiceProvider(dashboardFavoritesServiceFactory),
};

export const registry = new PluginServiceRegistry<DashboardServices>(providers);
