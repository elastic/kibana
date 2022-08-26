/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DashboardChromeService } from './chrome/types';
import { DashboardCapabilitiesService } from './dashboard_capabilities/types';
import { DashboardDataService } from './data/types';
import { DashboardDataViewEditorService } from './data_view_editor/types';
import { DashboardEmbeddableService } from './embeddable/types';
import { DashboardHTTPService } from './http/types';
import { DashboardNavigationService } from './navigation/types';
import { DashboardNotificationsService } from './notifications/types';
import { DashboardOverlaysService } from './overlays/types';
import { DashboardSettingsService } from './settings/types';
import { DashboardSpacesService } from './spaces/types';
import { DashboardVisualizationsService } from './visualizations/types';

export interface DashboardServices {
  // dependency services
  chrome: DashboardChromeService;
  dashboardCapabilities: DashboardCapabilitiesService;
  data: DashboardDataService;
  dataViewEditor: DashboardDataViewEditorService; // used only for no data state
  embeddable: DashboardEmbeddableService;
  http: DashboardHTTPService;
  navigation: DashboardNavigationService;
  notifications: DashboardNotificationsService;
  overlays: DashboardOverlaysService;
  settings: DashboardSettingsService;
  spaces: DashboardSpacesService;
  visualizations: DashboardVisualizationsService;
}
