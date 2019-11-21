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

import _ from 'lodash';
import { RefreshInterval, TimefilterContract } from 'src/plugins/data/public';
import { AppState } from '../legacy_imports';
import { FilterUtils } from './filter_utils';
import { SavedObjectDashboard } from '../saved_dashboard/saved_dashboard';

export function updateSavedDashboard(
  savedDashboard: SavedObjectDashboard,
  appState: AppState,
  timeFilter: TimefilterContract,
  toJson: <T>(object: T) => string
) {
  savedDashboard.title = appState.title;
  savedDashboard.description = appState.description;
  savedDashboard.timeRestore = appState.timeRestore;
  savedDashboard.panelsJSON = toJson(appState.panels);
  savedDashboard.optionsJSON = toJson(appState.options);

  savedDashboard.timeFrom = savedDashboard.timeRestore
    ? FilterUtils.convertTimeToUTCString(timeFilter.getTime().from)
    : undefined;
  savedDashboard.timeTo = savedDashboard.timeRestore
    ? FilterUtils.convertTimeToUTCString(timeFilter.getTime().to)
    : undefined;
  const timeRestoreObj: RefreshInterval = _.pick(timeFilter.getRefreshInterval(), [
    'display',
    'pause',
    'section',
    'value',
  ]);
  savedDashboard.refreshInterval = savedDashboard.timeRestore ? timeRestoreObj : undefined;
}
