/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
    delete sessionStoragePanels[id];
    this.sessionStorage.set(DASHBOARD_PANELS_SESSION_KEY, sessionStoragePanels);
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
}
