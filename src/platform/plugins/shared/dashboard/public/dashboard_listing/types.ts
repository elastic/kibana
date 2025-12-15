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
import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import type { DashboardListingViewRegistry } from '../plugin';

export const TAB_IDS = {
  DASHBOARDS: 'dashboards',
} as const;

export type TabId = (typeof TAB_IDS)[keyof typeof TAB_IDS];
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
