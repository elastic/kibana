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

import { i18n } from '@kbn/i18n';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { set } from '@kbn/safer-lodash-set';

import { ViewMode } from '@kbn/presentation-publishing';
import { coreServices, spacesService } from './kibana_services';
import { DashboardState } from '../../common';

export const DASHBOARD_PANELS_UNSAVED_ID = 'unsavedDashboard';
const DASHBOARD_VIEWMODE_LOCAL_KEY = 'dashboardViewMode';

// this key is named `panels` for BWC reasons, but actually contains the entire dashboard state
const DASHBOARD_STATE_SESSION_KEY = 'dashboardStateManagerPanels';

const getPanelsGetError = (message: string) =>
  i18n.translate('dashboard.panelStorageError.getError', {
    defaultMessage: 'Error encountered while fetching unsaved changes: {message}',
    values: { message },
  });

export type DashboardBackupState = Partial<DashboardState> & {
  viewMode?: ViewMode;
};

interface DashboardBackupServiceType {
  clearState: (id?: string) => void;
  getState: (id: string | undefined) => DashboardBackupState | undefined;
  setState: (id: string | undefined, backupState: DashboardBackupState) => void;
  getViewMode: () => ViewMode;
  storeViewMode: (viewMode: ViewMode) => void;
  getDashboardIdsWithUnsavedChanges: () => string[];
  dashboardHasUnsavedEdits: (id?: string) => boolean;
}

class DashboardBackupService implements DashboardBackupServiceType {
  private activeSpaceId: string;
  private sessionStorage: Storage;
  private localStorage: Storage;
  private prevDashboardIdsWithUnsavedChanges: string[] = [];

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
    return this.localStorage.get(DASHBOARD_VIEWMODE_LOCAL_KEY) ?? 'view';
  };

  public storeViewMode = (viewMode: ViewMode) => {
    try {
      this.localStorage.set(DASHBOARD_VIEWMODE_LOCAL_KEY, viewMode);
    } catch (e) {
      coreServices.notifications.toasts.addDanger({
        title: i18n.translate('dashboard.viewmodeBackup.error', {
          defaultMessage: 'Error encountered while backing up view mode: {message}',
          values: { message: e.message },
        }),
        'data-test-subj': 'dashboardViewmodeBackupFailure',
      });
    }
  };

  public clearState(id = DASHBOARD_PANELS_UNSAVED_ID) {
    try {
      const allSpaces = this.sessionStorage.get(DASHBOARD_STATE_SESSION_KEY) ?? {};
      const dashboards = this.getDashboards();
      if (dashboards[id]) {
        delete dashboards[id];
        this.sessionStorage.set(DASHBOARD_STATE_SESSION_KEY, {
          ...allSpaces,
          [this.activeSpaceId]: dashboards,
        });
      }
    } catch (e) {
      coreServices.notifications.toasts.addDanger({
        title: i18n.translate('dashboard.panelStorageError.clearError', {
          defaultMessage: 'Error encountered while clearing unsaved changes: {message}',
          values: { message: e.message },
        }),
        'data-test-subj': 'dashboardPanelsClearFailure',
      });
    }
  }

  public getState(id = DASHBOARD_PANELS_UNSAVED_ID) {
    try {
      const dashboards = this.getDashboards();
      return dashboards[id];
    } catch (e) {
      coreServices.notifications.toasts.addDanger({
        title: getPanelsGetError(e.message),
        'data-test-subj': 'dashboardPanelsGetFailure',
      });
    }
  }

  public setState(id = DASHBOARD_PANELS_UNSAVED_ID, backupState: DashboardBackupState) {
    try {
      const allSpaces = this.sessionStorage.get(DASHBOARD_STATE_SESSION_KEY) ?? {};
      set(allSpaces, [this.activeSpaceId, id], backupState);
      this.sessionStorage.set(DASHBOARD_STATE_SESSION_KEY, allSpaces);
    } catch (e) {
      coreServices.notifications.toasts.addDanger({
        title: i18n.translate('dashboard.panelStorageError.setError', {
          defaultMessage: 'Error encountered while setting unsaved changes: {message}',
          values: { message: e.message },
        }),
        'data-test-subj': 'dashboardPanelsSetFailure',
      });
    }
  }

  public getDashboardIdsWithUnsavedChanges() {
    try {
      const dashboards = this.getDashboards();

      const dashboardIdsWithUnsavedChanges = Object.keys(dashboards).filter((dashboardId) => {
        return hasUnsavedEdits(dashboards[dashboardId]);
      });

      /**
       * Because we are storing these unsaved dashboard IDs in React component state, we only want things to be re-rendered
       * if the **contents** change, not if the array reference changes
       */
      if (isEqual(this.prevDashboardIdsWithUnsavedChanges, dashboardIdsWithUnsavedChanges)) {
        return this.prevDashboardIdsWithUnsavedChanges;
      }

      this.prevDashboardIdsWithUnsavedChanges = dashboardIdsWithUnsavedChanges;
      return dashboardIdsWithUnsavedChanges;
    } catch (e) {
      coreServices.notifications.toasts.addDanger({
        title: getPanelsGetError(e.message),
        'data-test-subj': 'dashboardPanelsGetFailure',
      });
      return [];
    }
  }

  public dashboardHasUnsavedEdits(id = DASHBOARD_PANELS_UNSAVED_ID) {
    const dashboards = this.getDashboards();
    return hasUnsavedEdits(dashboards[id]);
  }

  private getDashboards(): { [key: string]: DashboardBackupState } {
    return this.sessionStorage.get(DASHBOARD_STATE_SESSION_KEY)?.[this.activeSpaceId] ?? {};
  }
}

function hasUnsavedEdits(backupState?: DashboardBackupState) {
  return backupState
    ? backupState.viewMode === 'edit' &&
        Object.keys(backupState).some(
          (stateKey) => stateKey !== 'viewMode' && stateKey !== 'references'
        )
    : false;
}

let dashboardBackupService: DashboardBackupService;

export const getDashboardBackupService = () => {
  if (!dashboardBackupService) {
    dashboardBackupService = new DashboardBackupService();
  }
  return dashboardBackupService;
};
