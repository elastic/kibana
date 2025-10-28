/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { SavedObjectSaveOpts } from '@kbn/saved-objects-plugin/public';

import type { DashboardState } from '../../../server/content_management';
import type { DashboardDuplicateTitleCheckProps } from './lib/check_for_duplicate_dashboard_title';
import type {
  FindDashboardsByIdResponse,
  SearchDashboardsArgs,
  SearchDashboardsResponse,
} from './lib/find_dashboards';
import type { UpdateDashboardMetaProps } from './lib/update_dashboard_meta';

export interface DashboardContentManagementService {
  findDashboards: FindDashboardsService;
  deleteDashboards: (ids: string[]) => Promise<void>;
  saveDashboardState: (props: SaveDashboardProps) => Promise<SaveDashboardReturn>;
  checkForDuplicateDashboardTitle: (meta: DashboardDuplicateTitleCheckProps) => Promise<boolean>;
  updateDashboardMeta: (props: UpdateDashboardMetaProps) => Promise<void>;
}

/**
 * Types for Saving Dashboards
 */
export type SavedDashboardSaveOpts = SavedObjectSaveOpts & { saveAsCopy?: boolean };

export interface SaveDashboardProps {
  controlGroupReferences?: Reference[];
  dashboardState: DashboardState;
  saveOptions: SavedDashboardSaveOpts;
  panelReferences?: Reference[];
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

/**
 * Types for Finding Dashboards
 */
export interface FindDashboardsService {
  search: (
    props: Pick<
      SearchDashboardsArgs,
      'hasReference' | 'hasNoReference' | 'search' | 'size' | 'options'
    >
  ) => Promise<SearchDashboardsResponse>;
  findById: (id: string) => Promise<FindDashboardsByIdResponse>;
  findByIds: (ids: string[]) => Promise<FindDashboardsByIdResponse[]>;
  findByTitle: (title: string) => Promise<{ id: string } | undefined>;
}
