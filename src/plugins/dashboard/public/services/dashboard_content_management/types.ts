/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import { ControlGroupRuntimeState } from '@kbn/controls-plugin/public';
import { SavedObjectSaveOpts } from '@kbn/saved-objects-plugin/public';

import { DashboardContainerInput } from '../../../common';
import { DashboardAttributes, DashboardCrudTypes } from '../../../common/content_management';
import { DashboardStartDependencies } from '../../plugin';
import { DashboardBackupServiceType } from '../dashboard_backup/types';
import { DashboardInitializerContextService } from '../initializer_context/types';
import { DashboardDuplicateTitleCheckProps } from './lib/check_for_duplicate_dashboard_title';
import {
  FindDashboardsByIdResponse,
  SearchDashboardsArgs,
  SearchDashboardsResponse,
} from './lib/find_dashboards';

export interface DashboardContentManagementRequiredServices {
  dashboardBackup: DashboardBackupServiceType;
  initializerContext: DashboardInitializerContextService;
}

export interface DashboardContentManagementService {
  findDashboards: FindDashboardsService;
  deleteDashboards: (ids: string[]) => Promise<void>;
  loadDashboardState: (props: { id?: string }) => Promise<LoadDashboardReturn>;
  saveDashboardState: (props: SaveDashboardProps) => Promise<SaveDashboardReturn>;
  checkForDuplicateDashboardTitle: (meta: DashboardDuplicateTitleCheckProps) => Promise<boolean>;
  updateDashboardMeta: (
    props: Pick<DashboardContainerInput, 'id' | 'title' | 'description' | 'tags'>
  ) => Promise<void>;
}

/**
 * Types for Loading Dashboards
 */
export interface LoadDashboardFromSavedObjectProps {
  id?: string;
  contentManagement: DashboardStartDependencies['contentManagement'];
}

type DashboardResolveMeta = DashboardCrudTypes['GetOut']['meta'];

export type SavedDashboardInput = DashboardContainerInput & {
  /**
   * Serialized control group state.
   * Contains state loaded from dashboard saved object
   */
  controlGroupInput?: DashboardAttributes['controlGroupInput'] | undefined;
  /**
   * Runtime control group state.
   * Contains state passed from dashboard locator
   * Use runtime state when building input for portable dashboards
   */
  controlGroupState?: Partial<ControlGroupRuntimeState>;
};

export interface LoadDashboardReturn {
  dashboardFound: boolean;
  newDashboardCreated?: boolean;
  dashboardId?: string;
  managed?: boolean;
  resolveMeta?: DashboardResolveMeta;
  dashboardInput: SavedDashboardInput;
  anyMigrationRun?: boolean;

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
  currentState: SavedDashboardInput;
  saveOptions: SavedDashboardSaveOpts;
  panelReferences?: Reference[];
  lastSavedId?: string;
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
