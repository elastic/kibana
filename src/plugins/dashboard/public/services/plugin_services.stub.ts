/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  PluginServiceProvider,
  PluginServiceProviders,
  PluginServiceRegistry,
} from '@kbn/presentation-util-plugin/public';

import { DashboardServices } from './types';

import { contentManagementServiceFactory } from './content_management/content_management_service.stub';
import { dashboardBackupServiceFactory } from './dashboard_backup/dashboard_backup.stub';
import { dashboardCapabilitiesServiceFactory } from './dashboard_capabilities/dashboard_capabilities.stub';
import { dashboardContentInsightsServiceFactory } from './dashboard_content_insights/dashboard_content_insights.stub';
import { dashboardContentManagementServiceFactory } from './dashboard_content_management/dashboard_content_management.stub';
import { dashboardFavoritesServiceFactory } from './dashboard_favorites/dashboard_favorites_service.stub';
import { dashboardRecentlyAccessedServiceFactory } from './dashboard_recently_accessed/dashboard_recently_accessed.stub';
import { initializerContextServiceFactory } from './initializer_context/initializer_context.stub';
import { noDataPageServiceFactory } from './no_data_page/no_data_page_service.stub';
import { observabilityAIAssistantServiceStubFactory } from './observability_ai_assistant/observability_ai_assistant_service.stub';
import { savedObjectsManagementServiceFactory } from './saved_objects_management/saved_objects_management_service.stub';
import { savedObjectsTaggingServiceFactory } from './saved_objects_tagging/saved_objects_tagging.stub';
import { screenshotModeServiceFactory } from './screenshot_mode/screenshot_mode.stub';
import { serverlessServiceFactory } from './serverless/serverless_service.stub';
import { uiActionsServiceFactory } from './ui_actions/ui_actions_service.stub';
import { urlForwardingServiceFactory } from './url_forwarding/url_fowarding.stub';
import { usageCollectionServiceFactory } from './usage_collection/usage_collection.stub';

export const providers: PluginServiceProviders<DashboardServices> = {
  dashboardContentManagement: new PluginServiceProvider(dashboardContentManagementServiceFactory),
  dashboardCapabilities: new PluginServiceProvider(dashboardCapabilitiesServiceFactory),
  dashboardBackup: new PluginServiceProvider(dashboardBackupServiceFactory),
  initializerContext: new PluginServiceProvider(initializerContextServiceFactory),
  savedObjectsTagging: new PluginServiceProvider(savedObjectsTaggingServiceFactory),
  screenshotMode: new PluginServiceProvider(screenshotModeServiceFactory),
  urlForwarding: new PluginServiceProvider(urlForwardingServiceFactory),
  usageCollection: new PluginServiceProvider(usageCollectionServiceFactory),
  savedObjectsManagement: new PluginServiceProvider(savedObjectsManagementServiceFactory),
  contentManagement: new PluginServiceProvider(contentManagementServiceFactory),
  serverless: new PluginServiceProvider(serverlessServiceFactory),
  noDataPage: new PluginServiceProvider(noDataPageServiceFactory),
  uiActions: new PluginServiceProvider(uiActionsServiceFactory),
  observabilityAIAssistant: new PluginServiceProvider(observabilityAIAssistantServiceStubFactory),
  dashboardRecentlyAccessed: new PluginServiceProvider(dashboardRecentlyAccessedServiceFactory),
  dashboardContentInsights: new PluginServiceProvider(dashboardContentInsightsServiceFactory),
  dashboardFavorites: new PluginServiceProvider(dashboardFavoritesServiceFactory),
};

export const registry = new PluginServiceRegistry<DashboardServices>(providers);
