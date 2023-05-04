/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PresentationLabsService } from './labs/types';
import { PresentationDashboardsService } from './dashboards/types';
import { PresentationCapabilitiesService } from './capabilities/types';
import { PresentationDataViewsService } from './data_views/types';
import { PresentationUiActionsService } from './ui_actions/types';

export interface PresentationUtilServices {
  capabilities: PresentationCapabilitiesService;
  dashboards: PresentationDashboardsService;
  dataViews: PresentationDataViewsService;
  uiActions: PresentationUiActionsService;
  labs: PresentationLabsService;
}

export type {
  PresentationCapabilitiesService,
  PresentationDashboardsService,
  PresentationLabsService,
};
