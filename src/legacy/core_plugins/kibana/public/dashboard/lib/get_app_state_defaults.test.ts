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
jest.mock(
  'ui/chrome',
  () => ({
    getKibanaVersion: () => '6.3.0',
  }),
  { virtual: true }
);

jest.mock(
  'ui/notify',
  () => ({
    toastNotifications: {
      addDanger: () => {},
    },
  }),
  { virtual: true }
);

import { getSavedDashboardMock } from '../__tests__';
import { SavedObjectDashboard } from '../saved_dashboard/saved_dashboard';
import { getAppStateDefaults } from './get_app_state_defaults';

test('getAppStateDefaults migrates old uiState into embeddableConfig', () => {
  const savedDashboard: SavedObjectDashboard = getSavedDashboardMock({
    panelsJSON: '[{ "panelIndex": "1", "col": 0, "row": 0}]',
    uiStateJSON: '{ "P-1": {"hi": "bye"}}',
  });

  const defaults = getAppStateDefaults(savedDashboard, false);
  const panel = defaults.panels.find(p => p.panelIndex === '1');

  expect(panel).toBeDefined();
  if (panel) {
    expect(panel.embeddableConfig.hi).toBe('bye');
  }
  expect(savedDashboard.uiStateJSON).toBeUndefined();
});

test('getAppStateDefaults migrates columns and sort into embeddableConfig', () => {
  const savedDashboard: SavedObjectDashboard = getSavedDashboardMock({
    panelsJSON: '[{ "panelIndex": "1", "columns": ["hi"], "sort": "hi", "version": "6.3.1." }]',
    uiStateJSON: '{ "P-1": {"see": "shells"}}',
  });

  const defaults = getAppStateDefaults(savedDashboard, false);
  const panel = defaults.panels.find(p => p.panelIndex === '1');

  expect(panel).toBeDefined();
  if (panel) {
    expect(panel.embeddableConfig.see).toBe('shells');
    expect(panel.embeddableConfig.columns).toEqual(['hi']);
    expect(panel.embeddableConfig.sort).toEqual('hi');
    // @ts-ignore
    expect(panel.sort).toBeUndefined();
    // @ts-ignore
    expect(panel.columns).toBeUndefined();
  }
});
