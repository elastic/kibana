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

import { SavedDashboardPanel } from '../types';
import { migrateAppState } from './migrate_app_state';

test('migrate app state from 6.0', async () => {
  const mockSave = jest.fn();
  const appState = {
    uiState: {
      'P-1': { vis: { defaultColors: { '0+-+100': 'rgb(0,104,55)' } } },
    },
    panels: [
      {
        col: 1,
        id: 'Visualization-MetricChart',
        panelIndex: 1,
        row: 1,
        size_x: 6,
        size_y: 3,
        type: 'visualization',
      },
    ],
    translateHashToRison: () => 'a',
    getQueryParamName: () => 'a',
    save: mockSave,
  };
  migrateAppState(appState);
  expect(appState.uiState).toBeUndefined();
  expect(((appState.panels[0] as unknown) as SavedDashboardPanel).gridData.w).toBe(24);
  expect(((appState.panels[0] as unknown) as SavedDashboardPanel).gridData.h).toBe(15);
  expect(
    ((appState.panels[0] as unknown) as SavedDashboardPanel).embeddableConfig.vis.defaultColors[
      '0+-+100'
    ]
  ).toBe('rgb(0,104,55)');
  expect(mockSave).toBeCalledTimes(1);
});
