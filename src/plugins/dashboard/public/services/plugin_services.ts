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
  PluginServices,
} from '@kbn/presentation-util-plugin/public';

import { DashboardPluginServiceParams, DashboardServices } from './types';

import { dashboardCapabilitiesServiceFactory } from './dashboard_capabilities/dashboard_capabilities_service';
import { dashboardBackupServiceFactory } from './dashboard_backup/dashboard_backup_service';
import { dataViewEditorServiceFactory } from './data_view_editor/data_view_editor_service';
import { initializerContextServiceFactory } from './initializer_context/initializer_context_service';
import { navigationServiceFactory } from './navigation/navigation_service';
import { screenshotModeServiceFactory } from './screenshot_mode/screenshot_mode_service';
import { savedObjectsTaggingServiceFactory } from './saved_objects_tagging/saved_objects_tagging_service';
import { shareServiceFactory } from './share/share_services';
import { spacesServiceFactory } from './spaces/spaces_service';
import { urlForwardingServiceFactory } from './url_forwarding/url_forwarding_service';
import { visualizationsServiceFactory } from './visualizations/visualizations_service';
import { usageCollectionServiceFactory } from './usage_collection/usage_collection_service';
import { customBrandingServiceFactory } from './custom_branding/custom_branding_service';
import { savedObjectsManagementServiceFactory } from './saved_objects_management/saved_objects_management_service';
import { dashboardContentManagementServiceFactory } from './dashboard_content_management/dashboard_content_management_service';
import { contentManagementServiceFactory } from './content_management/content_management_service';
import { serverlessServiceFactory } from './serverless/serverless_service';
import { noDataPageServiceFactory } from './no_data_page/no_data_page_service';
import { uiActionsServiceFactory } from './ui_actions/ui_actions_service';
import { observabilityAIAssistantServiceFactory } from './observability_ai_assistant/observability_ai_assistant_service';
import { dashboardRecentlyAccessedFactory } from './dashboard_recently_accessed/dashboard_recently_accessed';
import { dashboardFavoritesServiceFactory } from './dashboard_favorites/dashboard_favorites_service';
import { dashboardContentInsightsServiceFactory } from './dashboard_content_insights/dashboard_content_insights_service';

const providers: PluginServiceProviders<DashboardServices, DashboardPluginServiceParams> = {
  dashboardContentManagement: new PluginServiceProvider(dashboardContentManagementServiceFactory, [
    'savedObjectsTagging',
    'initializerContext',
    'dashboardBackup',
    'screenshotMode',
    'spaces',
  ]),
  dashboardBackup: new PluginServiceProvider(dashboardBackupServiceFactory, ['spaces']),

  dashboardCapabilities: new PluginServiceProvider(dashboardCapabilitiesServiceFactory),
  dataViewEditor: new PluginServiceProvider(dataViewEditorServiceFactory),
  initializerContext: new PluginServiceProvider(initializerContextServiceFactory),
  navigation: new PluginServiceProvider(navigationServiceFactory),
  savedObjectsTagging: new PluginServiceProvider(savedObjectsTaggingServiceFactory),
  screenshotMode: new PluginServiceProvider(screenshotModeServiceFactory),
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
  observabilityAIAssistant: new PluginServiceProvider(observabilityAIAssistantServiceFactory),
  dashboardRecentlyAccessed: new PluginServiceProvider(dashboardRecentlyAccessedFactory),
  dashboardContentInsights: new PluginServiceProvider(dashboardContentInsightsServiceFactory),
  dashboardFavorites: new PluginServiceProvider(dashboardFavoritesServiceFactory),
};

export const pluginServices = new PluginServices<DashboardServices>();

export const registry = new PluginServiceRegistry<DashboardServices, DashboardPluginServiceParams>(
  providers
);
