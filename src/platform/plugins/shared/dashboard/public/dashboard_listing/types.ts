/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PropsWithChildren } from 'react';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { ViewMode } from '@kbn/presentation-publishing';
import type { VisualizationListItem, VisualizationStage } from '@kbn/visualizations-plugin/public';
import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import type { DashboardListingViewRegistry } from '../plugin';

export type TabId = (typeof TAB_IDS)[keyof typeof TAB_IDS];
export type { VisualizationListItem, VisualizationStage };
export const TAB_IDS = {
  DASHBOARDS: 'dashboards',
  VISUALIZATIONS: 'visualizations',
} as const;
export type DashboardListingProps = PropsWithChildren<{
  disableCreateDashboardButton?: boolean;
  initialFilter?: string;
  useSessionStorageIntegration?: boolean;
  goToDashboard: (dashboardId?: string, viewMode?: ViewMode) => void;
  getDashboardUrl: (dashboardId: string, usesTimeRestore: boolean) => string;
  urlStateEnabled?: boolean;
  showCreateDashboardButton?: boolean;
  listingViewRegistry: DashboardListingViewRegistry;
}>;

// Dashboard's own content type
export interface DashboardSavedObjectUserContent extends UserContentCommonSchema {
  type: 'dashboard';
  managed?: boolean;
  attributes: {
    title: string;
    description?: string;
    timeRestore: boolean;
  };
  canManageAccessControl?: boolean;
  accessMode?: SavedObjectAccessControl['accessMode'];
}

// TEMPORARY: Type for visualizations (hard-coded tab, should be moved to registry)
// TODO: Remove once visualizations tab is fully registered via listingViewRegistry
export interface DashboardVisualizationUserContent extends UserContentCommonSchema {
  type: string;
  managed?: boolean;
  icon: string;
  savedObjectType: string;
  title: string;
  typeTitle: string;
  image?: string;
  stage?: VisualizationStage;
  error?: string;
  editor?: VisualizationListItem['editor'];
  attributes: {
    title: string;
    description?: string;
    visType?: string;
    readOnly?: boolean;
  };
}
