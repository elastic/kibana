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
import { DashboardApplicationService } from './application/types';
import { DashboardChromeService } from './chrome/types';
import { DashboardCapabilitiesService } from './dashboard_capabilities/types';
import { DashboardDataService } from './data/types';
import { DashboardDataViewEditorService } from './data_view_editor/types';
import { DashboardEmbeddableService } from './embeddable/types';
import { DashboardHTTPService } from './http/types';
import { DashboardInitializerContextServiceType } from './initializer_context/types';
import { DashboardNavigationService } from './navigation/types';
import { DashboardNotificationsService } from './notifications/types';
import { DashboardOverlaysService } from './overlays/types';
import { DashboardSavedObjectsService } from './saved_objects/types';
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
  application: DashboardApplicationService;
  chrome: DashboardChromeService;
  data: DashboardDataService;
  dashboardCapabilities: DashboardCapabilitiesService;
  dataViewEditor: DashboardDataViewEditorService; // used only for no data state
  embeddable: DashboardEmbeddableService;
  http: DashboardHTTPService;
  initializerContext: DashboardInitializerContextServiceType;
  navigation: DashboardNavigationService;
  notifications: DashboardNotificationsService;
  overlays: DashboardOverlaysService;
  savedObjects: DashboardSavedObjectsService;
  screenshotMode: DashboardScreenshotModeService;
  settings: DashboardSettingsService;
  share: DashboardShareService; // TODO: make this optional in follow up
  spaces: DashboardSpacesService; // TODO: make this optional in follow up
  urlForwarding: DashboardUrlForwardingService;
  usageCollection: DashboardUsageCollectionService; // TODO: make this optional in follow up
  visualizations: DashboardVisualizationsService;
}
