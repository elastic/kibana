/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectSaveOpts } from '@kbn/saved-objects-plugin/public';

import {
  FindDashboardsByIdResponse,
  SearchDashboardsArgs,
  SearchDashboardsResponse,
} from './lib/find_dashboards';
import { DashboardDataService } from '../data/types';
import { DashboardSpacesService } from '../spaces/types';
import { DashboardContainerInput } from '../../../common';
import { DashboardStartDependencies } from '../../plugin';
import { DashboardEmbeddableService } from '../embeddable/types';
import { DashboardNotificationsService } from '../notifications/types';
import { DashboardCrudTypes } from '../../../common/content_management';
import { DashboardScreenshotModeService } from '../screenshot_mode/types';
import { DashboardInitializerContextService } from '../initializer_context/types';
import { DashboardSavedObjectsTaggingService } from '../saved_objects_tagging/types';
import { DashboardSessionStorageServiceType } from '../dashboard_session_storage/types';
import { DashboardDuplicateTitleCheckProps } from './lib/check_for_duplicate_dashboard_title';

export interface DashboardContentManagementRequiredServices {
  data: DashboardDataService;
  spaces: DashboardSpacesService;
  embeddable: DashboardEmbeddableService;
  notifications: DashboardNotificationsService;
  screenshotMode: DashboardScreenshotModeService;
  initializerContext: DashboardInitializerContextService;
  savedObjectsTagging: DashboardSavedObjectsTaggingService;
  dashboardSessionStorage: DashboardSessionStorageServiceType;
}

export interface DashboardContentManagementService {
  findDashboards: FindDashboardsService;
  deleteDashboards: (ids: string[]) => void;
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
  data: DashboardContentManagementRequiredServices['data'];
  contentManagement: DashboardStartDependencies['contentManagement'];
  embeddable: DashboardContentManagementRequiredServices['embeddable'];
  savedObjectsTagging: DashboardContentManagementRequiredServices['savedObjectsTagging'];
}

type DashboardResolveMeta = DashboardCrudTypes['GetOut']['meta'];

export interface LoadDashboardReturn {
  dashboardFound: boolean;
  dashboardId?: string;
  resolveMeta?: DashboardResolveMeta;
  dashboardInput: DashboardContainerInput;
  anyMigrationRun?: boolean;
}

/**
 * Types for Saving Dashboards
 */
export type SavedDashboardSaveOpts = SavedObjectSaveOpts & { saveAsCopy?: boolean };

export interface SaveDashboardProps {
  currentState: DashboardContainerInput;
  saveOptions: SavedDashboardSaveOpts;
  lastSavedId?: string;
}

export interface SaveDashboardReturn {
  id?: string;
  error?: string;
  redirectRequired?: boolean;
}

/**
 * Types for Finding Dashboards
 */
export interface FindDashboardsService {
  search: (
    props: Pick<SearchDashboardsArgs, 'hasReference' | 'hasNoReference' | 'search' | 'size'>
  ) => Promise<SearchDashboardsResponse>;
  findByIds: (ids: string[]) => Promise<FindDashboardsByIdResponse[]>;
  findByTitle: (title: string) => Promise<{ id: string } | undefined>;
}
