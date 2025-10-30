/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { Query, SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { SavedObjectSaveOpts } from '@kbn/saved-objects-plugin/public';

import type { DashboardState, DashboardAPIGetOut } from '../../../server/content_management';
import type { DashboardDuplicateTitleCheckProps } from './lib/check_for_duplicate_dashboard_title';

export interface DashboardContentManagementService {
  saveDashboardState: (props: SaveDashboardProps) => Promise<SaveDashboardReturn>;
  checkForDuplicateDashboardTitle: (meta: DashboardDuplicateTitleCheckProps) => Promise<boolean>;
}

/**
 * Types for Loading Dashboards
 */
export interface LoadDashboardFromSavedObjectProps {
  id?: string;
}

type DashboardResolveMeta = DashboardAPIGetOut['meta'];

export type DashboardSearchSource = Omit<SerializedSearchSourceFields, 'query'> & {
  query?: Query;
};

export interface LoadDashboardReturn {
  dashboardFound: boolean;
  newDashboardCreated?: boolean;
  dashboardId?: string;
  managed?: boolean;
  resolveMeta?: DashboardResolveMeta;
  dashboardInput: DashboardState;

  /**
   * Raw references returned directly from the Dashboard saved object. These
   * should be provided to the React Embeddable children on deserialize.
   */
  references: Reference[];
}

/**
 * Types for Saving Dashboards
 */
export type SavedDashboardSaveOpts = SavedObjectSaveOpts & { saveAsCopy?: boolean };

export interface SaveDashboardProps {
  dashboardState: DashboardState;
  references?: Reference[];
  saveOptions: SavedDashboardSaveOpts;
  searchSourceReferences?: Reference[];
  lastSavedId?: string;
}

export interface GetDashboardStateReturn {
  attributes: DashboardState;
  references: Reference[];
}

export interface SaveDashboardReturn {
  id?: string;
  error?: string;
  references?: Reference[];
  redirectRequired?: boolean;
}
