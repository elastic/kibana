/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from '@kbn/core/public';
import { KibanaPluginServiceParams } from '@kbn/presentation-util-plugin/public';

import { DashboardStartDependencies } from '../plugin';
import { DashboardAnalyticsService } from './analytics/types';
import { DashboardApplicationService } from './application/types';
import { DashboardChromeService } from './chrome/types';
import { DashboardCoreContextService } from './core_context/types';
import { DashboardCustomBrandingService } from './custom_branding/types';
import { DashboardCapabilitiesService } from './dashboard_capabilities/types';
import { DashboardSavedObjectService } from './dashboard_saved_object/types';
import { DashboardSessionStorageServiceType } from './dashboard_session_storage/types';
import { DashboardDataService } from './data/types';
import { DashboardDataViewEditorService } from './data_view_editor/types';
import { DashboardDocumentationLinksService } from './documentation_links/types';
import { DashboardEmbeddableService } from './embeddable/types';
import { DashboardHTTPService } from './http/types';
import { DashboardInitializerContextService } from './initializer_context/types';
import { DashboardNavigationService } from './navigation/types';
import { DashboardNotificationsService } from './notifications/types';
import { DashboardOverlaysService } from './overlays/types';
import { DashboardSavedObjectsTaggingService } from './saved_objects_tagging/types';
import { DashboardScreenshotModeService } from './screenshot_mode/types';
import { DashboardSettingsService } from './settings/types';
import { DashboardShareService } from './share/types';
import { DashboardSpacesService } from './spaces/types';
import { DashboardUrlForwardingService } from './url_forwarding/types';
import { DashboardUsageCollectionService } from './usage_collection/types';
import { DashboardVisualizationsService } from './visualizations/types';

export type DashboardPluginServiceParams = KibanaPluginServiceParams<DashboardStartDependencies> & {
  initContext: PluginInitializerContext; // need a custom type so that initContext is a required parameter for initializerContext
};
export interface DashboardServices {
  dashboardSavedObject: DashboardSavedObjectService;
  dashboardSessionStorage: DashboardSessionStorageServiceType;

  analytics: DashboardAnalyticsService;
  application: DashboardApplicationService;
  chrome: DashboardChromeService;
  coreContext: DashboardCoreContextService;
  dashboardCapabilities: DashboardCapabilitiesService;
  data: DashboardDataService;
  dataViewEditor: DashboardDataViewEditorService; // this service is used only for the no data state
  documentationLinks: DashboardDocumentationLinksService;
  embeddable: DashboardEmbeddableService;
  http: DashboardHTTPService;
  initializerContext: DashboardInitializerContextService;
  navigation: DashboardNavigationService;
  notifications: DashboardNotificationsService;
  overlays: DashboardOverlaysService;
  savedObjectsTagging: DashboardSavedObjectsTaggingService; // TODO: make this optional in follow up
  screenshotMode: DashboardScreenshotModeService;
  settings: DashboardSettingsService;
  share: DashboardShareService; // TODO: make this optional in follow up
  spaces: DashboardSpacesService; // TODO: make this optional in follow up
  urlForwarding: DashboardUrlForwardingService;
  usageCollection: DashboardUsageCollectionService; // TODO: make this optional in follow up
  visualizations: DashboardVisualizationsService;
  customBranding: DashboardCustomBrandingService;
}
