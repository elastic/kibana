/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Storage } from '../../services/kibana_utils';
import { SavedDashboardPanel } from '..';

export const DASHBOARD_PANELS_UNSAVED_ID = 'unsavedDashboard';
const DASHBOARD_PANELS_SESSION_KEY = 'dashboardStateManagerPanels';

export class DashboardPanelStorage {
  private sessionStorage: Storage;

  constructor() {
    this.sessionStorage = new Storage(sessionStorage);
  }

  public clearPanels(id = DASHBOARD_PANELS_UNSAVED_ID) {
    const sessionStoragePanels = this.sessionStorage.get(DASHBOARD_PANELS_SESSION_KEY) || {};
    if (sessionStoragePanels[id]) {
      delete sessionStoragePanels[id];
      this.sessionStorage.set(DASHBOARD_PANELS_SESSION_KEY, sessionStoragePanels);
    }
  }

  public getPanels(id = DASHBOARD_PANELS_UNSAVED_ID): SavedDashboardPanel[] | undefined {
    return this.sessionStorage.get(DASHBOARD_PANELS_SESSION_KEY)?.[id];
  }

  public setPanels(id = DASHBOARD_PANELS_UNSAVED_ID, newPanels: SavedDashboardPanel[]) {
    const sessionStoragePanels = this.sessionStorage.get(DASHBOARD_PANELS_SESSION_KEY) || {};
    sessionStoragePanels[id] = newPanels;
    this.sessionStorage.set(DASHBOARD_PANELS_SESSION_KEY, sessionStoragePanels);
  }

  public getDashboardIdsWithUnsavedChanges() {
    return Object.keys(this.sessionStorage.get(DASHBOARD_PANELS_SESSION_KEY) || {});
  }

  public dashboardHasUnsavedEdits(id = DASHBOARD_PANELS_UNSAVED_ID) {
    return this.getDashboardIdsWithUnsavedChanges().indexOf(id) !== -1;
  }
}
