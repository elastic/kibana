/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DashboardDataService } from './data/types';
import { DashboardDataViewEditorService } from './data_view_editor/types';
import { DashboardHTTPService } from './http/types';
import { DashboardSettingsService } from './settings/types';
import { DashboardSpacesService } from './spaces/types';
import { DashboardVisualizationsService } from './visualizations/types';

export interface DashboardServices {
  // dependency services
  data: DashboardDataService;
  dataViewEditor: DashboardDataViewEditorService; // used only for no data state
  http: DashboardHTTPService;
  settings: DashboardSettingsService;
  spaces: DashboardSpacesService;
  visualizations: DashboardVisualizationsService;
}
