/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom } from 'rxjs';

import { set } from '@kbn/safer-lodash-set';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';

import { DashboardSpacesService } from '../spaces/types';
import type { DashboardStartDependencies } from '../../plugin';
import type { DashboardSessionStorageServiceType } from './types';
import type { DashboardContainerByValueInput } from '../../../common';
import { DashboardNotificationsService } from '../notifications/types';
import { panelStorageErrorStrings } from '../../dashboard_container/_dashboard_container_strings';

export const DASHBOARD_PANELS_UNSAVED_ID = 'unsavedDashboard';
const DASHBOARD_PANELS_SESSION_KEY = 'dashboardStateManagerPanels';

interface DashboardSessionStorageRequiredServices {
  notifications: DashboardNotificationsService;
  spaces: DashboardSpacesService;
}

export type DashboardSessionStorageServiceFactory = KibanaPluginServiceFactory<
  DashboardSessionStorageServiceType,
  DashboardStartDependencies,
  DashboardSessionStorageRequiredServices
>;

class DashboardSessionStorageService implements DashboardSessionStorageServiceType {
  private activeSpaceId: string;
  private sessionStorage: Storage;
  private notifications: DashboardNotificationsService;
  private spaces: DashboardSpacesService;

  constructor(requiredServices: DashboardSessionStorageRequiredServices) {
    ({ notifications: this.notifications, spaces: this.spaces } = requiredServices);
    this.sessionStorage = new Storage(sessionStorage);

    this.activeSpaceId = 'default';
    if (this.spaces.getActiveSpace$) {
      firstValueFrom(this.spaces.getActiveSpace$()).then((space) => {
        this.activeSpaceId = space.id;
      });
    }
  }

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
        title: panelStorageErrorStrings.getPanelsClearError(e.message),
        'data-test-subj': 'dashboardPanelsClearFailure',
      });
    }
  }

  public getState(
    id = DASHBOARD_PANELS_UNSAVED_ID
  ): Partial<DashboardContainerByValueInput> | undefined {
    try {
      return this.sessionStorage.get(DASHBOARD_PANELS_SESSION_KEY)?.[this.activeSpaceId]?.[id];
    } catch (e) {
      this.notifications.toasts.addDanger({
        title: panelStorageErrorStrings.getPanelsGetError(e.message),
        'data-test-subj': 'dashboardPanelsGetFailure',
      });
    }
  }

  public setState(
    id = DASHBOARD_PANELS_UNSAVED_ID,
    newState: Partial<DashboardContainerByValueInput>
  ) {
    try {
      const sessionStateStorage = this.sessionStorage.get(DASHBOARD_PANELS_SESSION_KEY) || {};
      set(sessionStateStorage, [this.activeSpaceId, id], newState);
      this.sessionStorage.set(DASHBOARD_PANELS_SESSION_KEY, sessionStateStorage);
    } catch (e) {
      this.notifications.toasts.addDanger({
        title: panelStorageErrorStrings.getPanelsSetError(e.message),
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
      return dashboardsWithUnsavedChanges;
    } catch (e) {
      this.notifications.toasts.addDanger({
        title: panelStorageErrorStrings.getPanelsGetError(e.message),
        'data-test-subj': 'dashboardPanelsGetFailure',
      });
      return [];
    }
  }

  public dashboardHasUnsavedEdits(id = DASHBOARD_PANELS_UNSAVED_ID) {
    return this.getDashboardIdsWithUnsavedChanges().indexOf(id) !== -1;
  }
}

export const dashboardSessionStorageServiceFactory: DashboardSessionStorageServiceFactory = (
  core,
  requiredServices
) => {
  return new DashboardSessionStorageService(requiredServices);
};
