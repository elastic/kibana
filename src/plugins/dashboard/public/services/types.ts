/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginInitializerContext } from '@kbn/core/public';
import { KibanaPluginServiceParams } from '@kbn/presentation-util-plugin/public';
import { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';

import { DashboardStartDependencies } from '../plugin';
import { DashboardCustomBrandingService } from './custom_branding/types';
import { DashboardCapabilitiesService } from './dashboard_capabilities/types';
import { DashboardContentManagementService } from './dashboard_content_management/types';
import { DashboardBackupServiceType } from './dashboard_backup/types';
import { DashboardDataViewEditorService } from './data_view_editor/types';
import { DashboardEmbeddableService } from './embeddable/types';
import { DashboardInitializerContextService } from './initializer_context/types';
import { DashboardNavigationService } from './navigation/types';
import { DashboardSavedObjectsTaggingService } from './saved_objects_tagging/types';
import { DashboardScreenshotModeService } from './screenshot_mode/types';
import { DashboardShareService } from './share/types';
import { DashboardSpacesService } from './spaces/types';
import { DashboardUrlForwardingService } from './url_forwarding/types';
import { DashboardUsageCollectionService } from './usage_collection/types';
import { DashboardVisualizationsService } from './visualizations/types';
import { DashboardServerlessService } from './serverless/types';
import { NoDataPageService } from './no_data_page/types';
import { DashboardUiActionsService } from './ui_actions/types';
import { ObservabilityAIAssistantService } from './observability_ai_assistant/types';
import { DashboardRecentlyAccessedService } from './dashboard_recently_accessed/types';
import { DashboardContentInsightsService } from './dashboard_content_insights/types';
import { DashboardFavoritesService } from './dashboard_favorites/types';

export type DashboardPluginServiceParams = KibanaPluginServiceParams<DashboardStartDependencies> & {
  initContext: PluginInitializerContext; // need a custom type so that initContext is a required parameter for initializerContext
};
export interface DashboardServices {
  dashboardBackup: DashboardBackupServiceType;
  dashboardContentManagement: DashboardContentManagementService;

  dashboardCapabilities: DashboardCapabilitiesService;
  dataViewEditor: DashboardDataViewEditorService; // this service is used only for the no data state
  embeddable: DashboardEmbeddableService;
  initializerContext: DashboardInitializerContextService;
  navigation: DashboardNavigationService;
  savedObjectsTagging: DashboardSavedObjectsTaggingService; // TODO: make this optional in follow up
  screenshotMode: DashboardScreenshotModeService;
  share: DashboardShareService; // TODO: make this optional in follow up
  spaces: DashboardSpacesService; // TODO: make this optional in follow up
  urlForwarding: DashboardUrlForwardingService;
  usageCollection: DashboardUsageCollectionService; // TODO: make this optional in follow up
  visualizations: DashboardVisualizationsService;
  customBranding: DashboardCustomBrandingService;
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  contentManagement: ContentManagementPublicStart;
  serverless: DashboardServerlessService; // TODO: make this optional in follow up
  noDataPage: NoDataPageService;
  uiActions: DashboardUiActionsService;
  observabilityAIAssistant: ObservabilityAIAssistantService; // TODO: make this optional in follow up
  dashboardRecentlyAccessed: DashboardRecentlyAccessedService;
  dashboardContentInsights: DashboardContentInsightsService;
  dashboardFavorites: DashboardFavoritesService;
}
