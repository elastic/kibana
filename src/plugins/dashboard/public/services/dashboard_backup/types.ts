/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { SavedDashboardInput } from '../dashboard_content_management/types';

export interface DashboardBackupServiceType {
  clearState: (id?: string) => void;
  getState: (id: string | undefined) => Partial<SavedDashboardInput> | undefined;
  setState: (id: string | undefined, newState: Partial<SavedDashboardInput>) => void;
  getViewMode: () => ViewMode;
  storeViewMode: (viewMode: ViewMode) => void;
  getDashboardIdsWithUnsavedChanges: () => string[];
  dashboardHasUnsavedEdits: (id?: string) => boolean;
}
