/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ControlsDataViewsService } from './data_views/types';
import { ControlsOverlaysService } from './overlays/types';
import { ControlsDataService } from './data/types';
import { ControlsUnifiedSearchService } from './unified_search/types';
import { ControlsServiceType } from './controls/types';
import { ControlsHTTPService } from './http/types';
import { ControlsOptionsListService } from './options_list/types';
import { ControlsSettingsService } from './settings/types';
import { ControlsThemeService } from './theme/types';
import { ControlsEmbeddableService } from './embeddable/types';

export interface ControlsServices {
  // dependency services
  dataViews: ControlsDataViewsService;
  overlays: ControlsOverlaysService;
  embeddable: ControlsEmbeddableService;
  data: ControlsDataService;
  unifiedSearch: ControlsUnifiedSearchService;
  http: ControlsHTTPService;
  settings: ControlsSettingsService;
  theme: ControlsThemeService;

  // controls plugin's own services
  controls: ControlsServiceType;
  optionsList: ControlsOptionsListService;
}
