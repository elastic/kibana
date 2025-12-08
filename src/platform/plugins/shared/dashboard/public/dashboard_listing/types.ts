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

// Base interface with common fields
interface DashboardListingItemBase extends UserContentCommonSchema {
  managed?: boolean;
  attributes: {
    title: string;
    description?: string;
  };
}

export interface DashboardSavedObjectUserContent extends DashboardListingItemBase {
  attributes: DashboardListingItemBase['attributes'] & {
    timeRestore: boolean;
  };
}

export interface DashboardVisualizationUserContent extends DashboardListingItemBase {
  editor?: {
    editUrl?: string;
    editApp?: string;
    onEdit?: (id: string) => Promise<void>;
  };
  icon: string;
  savedObjectType: string;
  title: string;
  typeTitle: string;
  image?: string;
  stage?: 'experimental' | 'beta' | 'production';
  error?: string;
  attributes: DashboardListingItemBase['attributes'] & {
    visType?: string;
    readOnly?: boolean;
  };
}

export interface DashboardAnnotationGroupUserContent extends DashboardListingItemBase {
  attributes: DashboardListingItemBase['attributes'] & {
    indexPatternId?: string;
    dataViewSpec?: { id?: string; name?: string };
  };
}

export type DashboardListingUserContent =
  | DashboardSavedObjectUserContent
  | DashboardVisualizationUserContent
  | DashboardAnnotationGroupUserContent;
