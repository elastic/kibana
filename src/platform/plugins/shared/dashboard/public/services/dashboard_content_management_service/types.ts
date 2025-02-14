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
import { SavedObjectSaveOpts } from '@kbn/saved-objects-plugin/public';

import type { DashboardAttributes, DashboardGetOut } from '../../../server/content_management';
import { DashboardDuplicateTitleCheckProps } from './lib/check_for_duplicate_dashboard_title';
import {
  FindDashboardsByIdResponse,
  SearchDashboardsArgs,
  SearchDashboardsResponse,
} from './lib/find_dashboards';
import { DashboardState } from '../../dashboard_api/types';
import { UpdateDashboardMetaProps } from './lib/update_dashboard_meta';

export interface DashboardContentManagementService {
  findDashboards: FindDashboardsService;
  deleteDashboards: (ids: string[]) => Promise<void>;
  loadDashboardState: (props: { id?: string }) => Promise<LoadDashboardReturn>;
  saveDashboardState: (props: SaveDashboardProps) => Promise<SaveDashboardReturn>;
  checkForDuplicateDashboardTitle: (meta: DashboardDuplicateTitleCheckProps) => Promise<boolean>;
  updateDashboardMeta: (props: UpdateDashboardMetaProps) => Promise<void>;
}

/**
 * Types for Loading Dashboards
 */
export interface LoadDashboardFromSavedObjectProps {
  id?: string;
}

type DashboardResolveMeta = DashboardGetOut['meta'];

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
  controlGroupReferences?: Reference[];
  dashboardState: DashboardState;
  saveOptions: SavedDashboardSaveOpts;
  panelReferences?: Reference[];
  searchSourceReferences?: Reference[];
  lastSavedId?: string;
}

export interface GetDashboardStateReturn {
  attributes: DashboardAttributes;
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
