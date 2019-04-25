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

import { SaveOptions } from 'ui/saved_objects/saved_object';
import { DashboardStateManager } from '../dashboard_state_manager';
import { updateSavedDashboard } from './update_saved_dashboard';

/**
 * Saves the dashboard.
 * @param toJson {function} A custom toJson function. Used because the previous code used
 * the angularized toJson version, and it was unclear whether there was a reason not to use
 * JSON.stringify
 * @param timeFilter
 * @param dashboardStateManager {DashboardStateManager}
 * @param {object} [saveOptions={}]
 * @property {boolean} [saveOptions.confirmOverwrite=false] - If true, attempts to create the source so it
 * can confirm an overwrite if a document with the id already exists.
 * @property {boolean} [saveOptions.isTitleDuplicateConfirmed=false] - If true, save allowed with duplicate title
 * @property {func} [saveOptions.onTitleDuplicate] - function called if duplicate title exists.
 * When not provided, confirm modal will be displayed asking user to confirm or cancel save.
 * @returns {Promise<string>} A promise that if resolved, will contain the id of the newly saved
 * dashboard.
 */
export async function saveDashboard(
  toJson: (obj: any) => string,
  timeFilter: any,
  dashboardStateManager: DashboardStateManager,
  saveOptions: SaveOptions
) {
  dashboardStateManager.saveState();

  const savedDashboard = dashboardStateManager.savedDashboard;
  const appState = dashboardStateManager.appState;

  updateSavedDashboard(savedDashboard, appState, timeFilter, toJson);

  const id = await savedDashboard.save(saveOptions);

  dashboardStateManager.lastSavedDashboardFilters = dashboardStateManager.getFilterState();
  dashboardStateManager.resetState();
  return id;
}
