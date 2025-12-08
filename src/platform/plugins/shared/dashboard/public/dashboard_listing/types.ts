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
import type { DashboardListingViewRegistry } from '../plugin';

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

export interface DashboardSavedObjectUserContent extends UserContentCommonSchema {
  managed?: boolean;
  editor?: {
    editUrl?: string;
    editApp?: string;
    onEdit?: (id: string) => Promise<void>;
  }; // Editor info for proper navigation (Maps, Lens, etc.)
  attributes: {
    title: string;
    description?: string;
    timeRestore: boolean;
    visType?: string; // For visualizations only
    readOnly?: boolean; // For deprecated visualizations
    indexPatternId?: string; // For annotation groups - references existing data view
    dataViewSpec?: { id?: string; name?: string }; // For annotation groups - ad-hoc data view (optional)
  };
}

// Extended type for visualization items in dashboard listing (includes VisualizationListItem fields)
export interface DashboardVisualizationUserContent extends DashboardSavedObjectUserContent {
  icon: string;
  savedObjectType: string;
  title: string;
  typeTitle: string;
  image?: string;
  stage?: 'experimental' | 'beta' | 'production';
  error?: string;
}

// Union type for items that can be either dashboards, visualizations, or annotation groups
export type DashboardListingUserContent =
  | DashboardSavedObjectUserContent
  | DashboardVisualizationUserContent;
