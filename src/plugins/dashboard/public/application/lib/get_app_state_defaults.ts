/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { SavedObjectTagDecoratorTypeGuard } from '../../services/saved_objects_tagging_oss';
import { ViewMode } from '../../services/embeddable';
import { DashboardSavedObject } from '../../saved_dashboards';
import { DashboardAppStateDefaults } from '../../types';

export function getAppStateDefaults(
  savedDashboard: DashboardSavedObject,
  hideWriteControls: boolean,
  hasTaggingCapabilities: SavedObjectTagDecoratorTypeGuard
): DashboardAppStateDefaults {
  return {
    fullScreenMode: false,
    title: savedDashboard.title,
    description: savedDashboard.description || '',
    tags: hasTaggingCapabilities(savedDashboard) ? savedDashboard.getTags() : [],
    timeRestore: savedDashboard.timeRestore,
    panels: savedDashboard.panelsJSON ? JSON.parse(savedDashboard.panelsJSON) : [],
    options: savedDashboard.optionsJSON ? JSON.parse(savedDashboard.optionsJSON) : {},
    query: savedDashboard.getQuery(),
    filters: savedDashboard.getFilters(),
    viewMode: savedDashboard.id || hideWriteControls ? ViewMode.VIEW : ViewMode.EDIT,
  };
}
