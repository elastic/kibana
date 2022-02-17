/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { set } from '@elastic/safer-lodash-set';
import { Storage } from '../../services/kibana_utils';
import { NotificationsStart } from '../../services/core';
import { panelStorageErrorStrings } from '../../dashboard_strings';
import { DashboardState } from '../../types';
import { ViewMode } from '../../services/embeddable';

export const DASHBOARD_PANELS_UNSAVED_ID = 'unsavedDashboard';
const DASHBOARD_PANELS_SESSION_KEY = 'dashboardStateManagerPanels';

export class DashboardSessionStorage {
  private sessionStorage: Storage;

  constructor(private toasts: NotificationsStart['toasts'], private activeSpaceId: string) {
    this.sessionStorage = new Storage(sessionStorage);
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
      this.toasts.addDanger({
        title: panelStorageErrorStrings.getPanelsClearError(e.message),
        'data-test-subj': 'dashboardPanelsClearFailure',
      });
    }
  }

  public getState(id = DASHBOARD_PANELS_UNSAVED_ID): Partial<DashboardState> | undefined {
    try {
      return this.sessionStorage.get(DASHBOARD_PANELS_SESSION_KEY)?.[this.activeSpaceId]?.[id];
    } catch (e) {
      this.toasts.addDanger({
        title: panelStorageErrorStrings.getPanelsGetError(e.message),
        'data-test-subj': 'dashboardPanelsGetFailure',
      });
    }
  }

  public setState(id = DASHBOARD_PANELS_UNSAVED_ID, newState: Partial<DashboardState>) {
    try {
      const sessionStateStorage = this.sessionStorage.get(DASHBOARD_PANELS_SESSION_KEY) || {};
      set(sessionStateStorage, [this.activeSpaceId, id], newState);
      this.sessionStorage.set(DASHBOARD_PANELS_SESSION_KEY, sessionStateStorage);
    } catch (e) {
      this.toasts.addDanger({
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
      this.toasts.addDanger({
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
