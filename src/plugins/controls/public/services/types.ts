/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlsServiceType } from './controls/types';
import { ControlsCoreService } from './core/types';
import { ControlsDataService } from './data/types';
import { ControlsDataViewsService } from './data_views/types';
import { ControlsEmbeddableService } from './embeddable/types';
import { ControlsHTTPService } from './http/types';
import { ControlsOptionsListService } from './options_list/types';
import { ControlsOverlaysService } from './overlays/types';
import { ControlsSettingsService } from './settings/types';
import { ControlsStorageService } from './storage/types';
import { ControlsUnifiedSearchService } from './unified_search/types';

export interface ControlsServices {
  // dependency services
  dataViews: ControlsDataViewsService;
  overlays: ControlsOverlaysService;
  embeddable: ControlsEmbeddableService;
  data: ControlsDataService;
  unifiedSearch: ControlsUnifiedSearchService;
  http: ControlsHTTPService;
  settings: ControlsSettingsService;
  core: ControlsCoreService;

  // controls plugin's own services
  controls: ControlsServiceType;
  optionsList: ControlsOptionsListService;
  storage: ControlsStorageService;
}
