/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Storage } from '../../services/kibana_utils';
import { NotificationsStart } from '../../services/core';
import { panelStorageErrorStrings } from '../../dashboard_strings';
import { SavedDashboardPanel } from '..';

export const DASHBOARD_PANELS_UNSAVED_ID = 'unsavedDashboard';
const DASHBOARD_PANELS_SESSION_KEY = 'dashboardStateManagerPanels';

export class DashboardPanelStorage {
  private sessionStorage: Storage;

  constructor(private toasts: NotificationsStart['toasts']) {
    this.sessionStorage = new Storage(sessionStorage);
  }

  public clearPanels(id = DASHBOARD_PANELS_UNSAVED_ID) {
    try {
      const sessionStoragePanels = this.sessionStorage.get(DASHBOARD_PANELS_SESSION_KEY) || {};
      if (sessionStoragePanels[id]) {
        delete sessionStoragePanels[id];
        this.sessionStorage.set(DASHBOARD_PANELS_SESSION_KEY, sessionStoragePanels);
      }
    } catch (e) {
      this.toasts.addDanger({
        title: panelStorageErrorStrings.getPanelsClearError(e.message),
        'data-test-subj': 'dashboardPanelsClearFailure',
      });
    }
  }

  public getPanels(id = DASHBOARD_PANELS_UNSAVED_ID): SavedDashboardPanel[] | undefined {
    try {
      return this.sessionStorage.get(DASHBOARD_PANELS_SESSION_KEY)?.[id];
    } catch (e) {
      this.toasts.addDanger({
        title: panelStorageErrorStrings.getPanelsGetError(e.message),
        'data-test-subj': 'dashboardPanelsGetFailure',
      });
    }
  }

  public setPanels(id = DASHBOARD_PANELS_UNSAVED_ID, newPanels: SavedDashboardPanel[]) {
    try {
      const sessionStoragePanels = this.sessionStorage.get(DASHBOARD_PANELS_SESSION_KEY) || {};
      sessionStoragePanels[id] = newPanels;
      this.sessionStorage.set(DASHBOARD_PANELS_SESSION_KEY, sessionStoragePanels);
    } catch (e) {
      this.toasts.addDanger({
        title: panelStorageErrorStrings.getPanelsSetError(e.message),
        'data-test-subj': 'dashboardPanelsSetFailure',
      });
    }
  }

  public getDashboardIdsWithUnsavedChanges() {
    try {
      return Object.keys(this.sessionStorage.get(DASHBOARD_PANELS_SESSION_KEY) || {});
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
