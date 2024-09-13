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
import type { ViewMode } from '@kbn/embeddable-plugin/public';
import type { DashboardApplicationService } from '../services/application/types';

export type DashboardListingProps = PropsWithChildren<{
  disableCreateDashboardButton?: boolean;
  initialFilter?: string;
  useSessionStorageIntegration?: boolean;
  goToDashboard: (dashboardId?: string, viewMode?: ViewMode) => void;
  getDashboardUrl: (dashboardId: string, usesTimeRestore: boolean) => string;
  urlStateEnabled?: boolean;
  showCreateDashboardButton?: boolean;
}>;

// because the type of `application.capabilities.advancedSettings` is so generic, the provider
// requiring the `save` key to be part of it is causing type issues - so, creating a custom type
export type TableListViewApplicationService = DashboardApplicationService & {
  capabilities: { advancedSettings: { save: boolean } };
};

export interface DashboardSavedObjectUserContent extends UserContentCommonSchema {
  managed?: boolean;
  attributes: {
    title: string;
    description?: string;
    timeRestore: boolean;
  };
}
