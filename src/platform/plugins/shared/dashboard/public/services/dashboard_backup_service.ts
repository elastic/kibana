/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import { firstValueFrom } from 'rxjs';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { set } from '@kbn/safer-lodash-set';

import type { DashboardContainerInput } from '../../common';
import { backupServiceStrings } from '../dashboard_container/_dashboard_container_strings';
import { UnsavedPanelState } from '../dashboard_container/types';
import { coreServices, spacesService } from './kibana_services';
import { SavedDashboardInput } from './dashboard_content_management_service/types';

export const DASHBOARD_PANELS_UNSAVED_ID = 'unsavedDashboard';
export const PANELS_CONTROL_GROUP_KEY = 'controlGroup';
const DASHBOARD_PANELS_SESSION_KEY = 'dashboardPanels';
const DASHBOARD_VIEWMODE_LOCAL_KEY = 'dashboardViewMode';

// this key is named `panels` for BWC reasons, but actually contains the entire dashboard state
const DASHBOARD_STATE_SESSION_KEY = 'dashboardStateManagerPanels';

interface DashboardBackupServiceType {
  clearState: (id?: string) => void;
  getState: (id: string | undefined) =>
    | {
        dashboardState?: Partial<SavedDashboardInput>;
        panels?: UnsavedPanelState;
      }
    | undefined;
  setState: (
    id: string | undefined,
    dashboardState: Partial<SavedDashboardInput>,
    panels: UnsavedPanelState
  ) => void;
  getViewMode: () => ViewMode;
  storeViewMode: (viewMode: ViewMode) => void;
  getDashboardIdsWithUnsavedChanges: () => string[];
  dashboardHasUnsavedEdits: (id?: string) => boolean;
}

class DashboardBackupService implements DashboardBackupServiceType {
  private activeSpaceId: string;
  private sessionStorage: Storage;
  private localStorage: Storage;

  private oldDashboardsWithUnsavedChanges: string[] = [];

  constructor() {
    this.sessionStorage = new Storage(sessionStorage);
    this.localStorage = new Storage(localStorage);

    this.activeSpaceId = 'default';
    if (spacesService) {
      firstValueFrom(spacesService.getActiveSpace$()).then((space) => {
        this.activeSpaceId = space.id;
      });
    }
  }

  public getViewMode = (): ViewMode => {
    return this.localStorage.get(DASHBOARD_VIEWMODE_LOCAL_KEY);
  };

  public storeViewMode = (viewMode: ViewMode) => {
    try {
      this.localStorage.set(DASHBOARD_VIEWMODE_LOCAL_KEY, viewMode);
    } catch (e) {
      coreServices.notifications.toasts.addDanger({
        title: backupServiceStrings.viewModeStorageError(e.message),
        'data-test-subj': 'dashboardViewmodeBackupFailure',
      });
    }
  };

  public clearState(id = DASHBOARD_PANELS_UNSAVED_ID) {
    try {
      const dashboardStateStorage =
        this.sessionStorage.get(DASHBOARD_STATE_SESSION_KEY)?.[this.activeSpaceId] ?? {};
      if (dashboardStateStorage[id]) {
        delete dashboardStateStorage[id];
        this.sessionStorage.set(DASHBOARD_STATE_SESSION_KEY, {
          [this.activeSpaceId]: dashboardStateStorage,
        });
      }

      const panelsStorage =
        this.sessionStorage.get(DASHBOARD_PANELS_SESSION_KEY)?.[this.activeSpaceId] ?? {};
      if (panelsStorage[id]) {
        delete panelsStorage[id];
        this.sessionStorage.set(DASHBOARD_PANELS_SESSION_KEY, {
          [this.activeSpaceId]: panelsStorage,
        });
      }
    } catch (e) {
      coreServices.notifications.toasts.addDanger({
        title: backupServiceStrings.getPanelsClearError(e.message),
        'data-test-subj': 'dashboardPanelsClearFailure',
      });
    }
  }

  public getState(id = DASHBOARD_PANELS_UNSAVED_ID) {
    try {
      const dashboardState = this.sessionStorage.get(DASHBOARD_STATE_SESSION_KEY)?.[
        this.activeSpaceId
      ]?.[id] as Partial<DashboardContainerInput> | undefined;
      const panels = this.sessionStorage.get(DASHBOARD_PANELS_SESSION_KEY)?.[this.activeSpaceId]?.[
        id
      ] as UnsavedPanelState | undefined;

      return { dashboardState, panels };
    } catch (e) {
      coreServices.notifications.toasts.addDanger({
        title: backupServiceStrings.getPanelsGetError(e.message),
        'data-test-subj': 'dashboardPanelsGetFailure',
      });
    }
  }

  public setState(
    id = DASHBOARD_PANELS_UNSAVED_ID,
    newState: Partial<DashboardContainerInput>,
    unsavedPanels: UnsavedPanelState
  ) {
    try {
      const dashboardStateStorage = this.sessionStorage.get(DASHBOARD_STATE_SESSION_KEY) ?? {};
      set(dashboardStateStorage, [this.activeSpaceId, id], newState);
      this.sessionStorage.set(DASHBOARD_STATE_SESSION_KEY, dashboardStateStorage);

      const panelsStorage = this.sessionStorage.get(DASHBOARD_PANELS_SESSION_KEY) ?? {};
      set(panelsStorage, [this.activeSpaceId, id], unsavedPanels);
      this.sessionStorage.set(DASHBOARD_PANELS_SESSION_KEY, panelsStorage, true);
    } catch (e) {
      coreServices.notifications.toasts.addDanger({
        title: backupServiceStrings.getPanelsSetError(e.message),
        'data-test-subj': 'dashboardPanelsSetFailure',
      });
    }
  }

  public getDashboardIdsWithUnsavedChanges() {
    try {
      const dashboardStatesInSpace =
        this.sessionStorage.get(DASHBOARD_STATE_SESSION_KEY)?.[this.activeSpaceId] ?? {};
      const panelStatesInSpace =
        this.sessionStorage.get(DASHBOARD_PANELS_SESSION_KEY)?.[this.activeSpaceId] ?? {};

      const dashboardsSet: Set<string> = new Set<string>();

      [...Object.keys(panelStatesInSpace), ...Object.keys(dashboardStatesInSpace)].map(
        (dashboardId) => {
          if (
            dashboardStatesInSpace[dashboardId].viewMode === ViewMode.EDIT &&
            (Object.keys(dashboardStatesInSpace[dashboardId]).some(
              (stateKey) => stateKey !== 'viewMode'
            ) ||
              Object.keys(panelStatesInSpace?.[dashboardId]).length > 0)
          )
            dashboardsSet.add(dashboardId);
        }
      );
      const dashboardsWithUnsavedChanges = [...dashboardsSet];

      /**
       * Because we are storing these unsaved dashboard IDs in React component state, we only want things to be re-rendered
       * if the **contents** change, not if the array reference changes
       */
      if (!isEqual(this.oldDashboardsWithUnsavedChanges, dashboardsWithUnsavedChanges)) {
        this.oldDashboardsWithUnsavedChanges = dashboardsWithUnsavedChanges;
      }

      return this.oldDashboardsWithUnsavedChanges;
    } catch (e) {
      coreServices.notifications.toasts.addDanger({
        title: backupServiceStrings.getPanelsGetError(e.message),
        'data-test-subj': 'dashboardPanelsGetFailure',
      });
      return [];
    }
  }

  public dashboardHasUnsavedEdits(id = DASHBOARD_PANELS_UNSAVED_ID) {
    return this.getDashboardIdsWithUnsavedChanges().indexOf(id) !== -1;
  }
}

let dashboardBackupService: DashboardBackupService;

export const getDashboardBackupService = () => {
  if (!dashboardBackupService) {
    dashboardBackupService = new DashboardBackupService();
  }
  return dashboardBackupService;
};
