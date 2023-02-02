/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClientContract } from '@kbn/core/public';

import { DashboardDataService } from '../data/types';
import { DashboardSpacesService } from '../spaces/types';
import { DashboardEmbeddableService } from '../embeddable/types';
import { DashboardNotificationsService } from '../notifications/types';
import { DashboardScreenshotModeService } from '../screenshot_mode/types';
import { DashboardInitializerContextService } from '../initializer_context/types';
import { DashboardSavedObjectsTaggingService } from '../saved_objects_tagging/types';
import { DashboardSessionStorageServiceType } from '../dashboard_session_storage/types';

import {
  LoadDashboardFromSavedObjectProps,
  LoadDashboardFromSavedObjectReturn,
} from './lib/load_dashboard_state_from_saved_object';
import {
  SaveDashboardProps,
  SaveDashboardReturn,
} from './lib/save_dashboard_state_to_saved_object';
import {
  FindDashboardBySavedObjectIdsResult,
  FindDashboardSavedObjectsArgs,
  FindDashboardSavedObjectsResponse,
} from './lib/find_dashboard_saved_objects';
import { DashboardDuplicateTitleCheckProps } from './lib/check_for_duplicate_dashboard_title';

export interface DashboardSavedObjectRequiredServices {
  screenshotMode: DashboardScreenshotModeService;
  embeddable: DashboardEmbeddableService;
  spaces: DashboardSpacesService;
  data: DashboardDataService;
  initializerContext: DashboardInitializerContextService;
  notifications: DashboardNotificationsService;
  savedObjectsTagging: DashboardSavedObjectsTaggingService;
  dashboardSessionStorage: DashboardSessionStorageServiceType;
}
export interface DashboardSavedObjectService {
  loadDashboardStateFromSavedObject: (
    props: Pick<LoadDashboardFromSavedObjectProps, 'id'>
  ) => Promise<LoadDashboardFromSavedObjectReturn>;

  saveDashboardStateToSavedObject: (
    props: Pick<SaveDashboardProps, 'currentState' | 'saveOptions' | 'lastSavedId'>
  ) => Promise<SaveDashboardReturn>;
  findDashboards: {
    findSavedObjects: (
      props: Pick<
        FindDashboardSavedObjectsArgs,
        'hasReference' | 'hasNoReference' | 'search' | 'size'
      >
    ) => Promise<FindDashboardSavedObjectsResponse>;
    findByIds: (ids: string[]) => Promise<FindDashboardBySavedObjectIdsResult[]>;
    findByTitle: (title: string) => Promise<{ id: string } | undefined>;
  };
  checkForDuplicateDashboardTitle: (meta: DashboardDuplicateTitleCheckProps) => Promise<boolean>;
  savedObjectsClient: SavedObjectsClientContract;
}

export type { SaveDashboardReturn };
