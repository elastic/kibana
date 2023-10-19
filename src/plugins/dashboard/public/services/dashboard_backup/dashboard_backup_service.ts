/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom } from 'rxjs';
import { isEqual } from 'lodash';

import { set } from '@kbn/safer-lodash-set';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';

import { DashboardSpacesService } from '../spaces/types';
import type { DashboardStartDependencies } from '../../plugin';
import type { DashboardBackupServiceType } from './types';
import type { DashboardContainerInput } from '../../../common';
import { DashboardNotificationsService } from '../notifications/types';
import { backupServiceStrings } from '../../dashboard_container/_dashboard_container_strings';

export const DASHBOARD_PANELS_UNSAVED_ID = 'unsavedDashboard';
const DASHBOARD_PANELS_SESSION_KEY = 'dashboardStateManagerPanels';
const DASHBOARD_VIEWMODE_LOCAL_KEY = 'dashboardViewMode';

interface DashboardBackupRequiredServices {
  notifications: DashboardNotificationsService;
  spaces: DashboardSpacesService;
}

export type DashboardBackupServiceFactory = KibanaPluginServiceFactory<
  DashboardBackupServiceType,
  DashboardStartDependencies,
  DashboardBackupRequiredServices
>;

class DashboardBackupService implements DashboardBackupServiceType {
  private activeSpaceId: string;
  private sessionStorage: Storage;
  private localStorage: Storage;
  private notifications: DashboardNotificationsService;
  private spaces: DashboardSpacesService;

  private oldDashboardsWithUnsavedChanges: string[] = [];

  constructor(requiredServices: DashboardBackupRequiredServices) {
    ({ notifications: this.notifications, spaces: this.spaces } = requiredServices);
    this.sessionStorage = new Storage(sessionStorage);
    this.localStorage = new Storage(localStorage);

    this.activeSpaceId = 'default';
    if (this.spaces.getActiveSpace$) {
      firstValueFrom(this.spaces.getActiveSpace$()).then((space) => {
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
      this.notifications.toasts.addDanger({
        title: backupServiceStrings.viewModeStorageError(e.message),
        'data-test-subj': 'dashboardViewmodeBackupFailure',
      });
    }
  };

  public clearState(id = DASHBOARD_PANELS_UNSAVED_ID) {
    try {
      const sessionStorage = this.sessionStorage.get(DASHBOARD_PANELS_SESSION_KEY);
      const sessionStorageForSpace = sessionStorage?.[this.activeSpaceId] || {};
      if (sessionStorageForSpace[id]) {
        delete sessionStorageForSpace[id];
        this.sessionStorage.set(DASHBOARD_PANELS_SESSION_KEY, sessionStorage);
      }
    } catch (e) {
      this.notifications.toasts.addDanger({
        title: backupServiceStrings.getPanelsClearError(e.message),
        'data-test-subj': 'dashboardPanelsClearFailure',
      });
    }
  }

  public getState(id = DASHBOARD_PANELS_UNSAVED_ID): Partial<DashboardContainerInput> | undefined {
    try {
      return this.sessionStorage.get(DASHBOARD_PANELS_SESSION_KEY)?.[this.activeSpaceId]?.[id];
    } catch (e) {
      this.notifications.toasts.addDanger({
        title: backupServiceStrings.getPanelsGetError(e.message),
        'data-test-subj': 'dashboardPanelsGetFailure',
      });
    }
  }

  public setState(id = DASHBOARD_PANELS_UNSAVED_ID, newState: Partial<DashboardContainerInput>) {
    try {
      const sessionStateStorage = this.sessionStorage.get(DASHBOARD_PANELS_SESSION_KEY) || {};
      set(sessionStateStorage, [this.activeSpaceId, id], newState);
      this.sessionStorage.set(DASHBOARD_PANELS_SESSION_KEY, sessionStateStorage);
    } catch (e) {
      this.notifications.toasts.addDanger({
        title: backupServiceStrings.getPanelsSetError(e.message),
        'data-test-subj': 'dashboardPanelsSetFailure',
      });
    }
  }

  public getDashboardIdsWithUnsavedChanges() {
    try {
      const dashboardStatesInSpace =
        this.sessionStorage.get(DASHBOARD_PANELS_SESSION_KEY)?.[this.activeSpaceId] || {};
      const dashboardsWithUnsavedChanges: string[] = [];

      Object.keys(dashboardStatesInSpace).map((dashboardId) => {
        if (
          dashboardStatesInSpace[dashboardId].viewMode === ViewMode.EDIT &&
          Object.keys(dashboardStatesInSpace[dashboardId]).some(
            (stateKey) => stateKey !== 'viewMode'
          )
        )
          dashboardsWithUnsavedChanges.push(dashboardId);
      });

      /**
       * Because we are storing these unsaved dashboard IDs in React component state, we only want things to be re-rendered
       * if the **contents** change, not if the array reference changes
       */
      if (!isEqual(this.oldDashboardsWithUnsavedChanges, dashboardsWithUnsavedChanges)) {
        this.oldDashboardsWithUnsavedChanges = dashboardsWithUnsavedChanges;
      }

      return this.oldDashboardsWithUnsavedChanges;
    } catch (e) {
      this.notifications.toasts.addDanger({
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

export const dashboardBackupServiceFactory: DashboardBackupServiceFactory = (
  core,
  requiredServices
) => {
  return new DashboardBackupService(requiredServices);
};
