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

import {
  convertSavedDashboardPanelToPanelState,
  convertPanelStateToSavedDashboardPanel,
} from './embeddable_saved_object_converters';
import { SavedDashboardPanel, Pre61SavedDashboardPanel } from '../types';
import { DashboardPanelState } from 'plugins/dashboard_embeddable';
import { EmbeddableInput } from 'plugins/embeddable_api';

interface CustomInput extends EmbeddableInput {
  something: string;
}

test('convertSavedDashboardPanelToPanelState', () => {
  const savedDashboardPanel: SavedDashboardPanel = {
    type: 'search',
    embeddableConfig: {
      something: 'hi!',
    },
    id: 'savedObjectId',
    panelIndex: '123',
    gridData: {
      x: 0,
      y: 0,
      h: 15,
      w: 15,
      i: '123',
    },
    version: '7.0.0',
  };

  expect(convertSavedDashboardPanelToPanelState(savedDashboardPanel, true)).toEqual({
    embeddableId: '123',
    gridData: {
      x: 0,
      y: 0,
      h: 15,
      w: 15,
      i: '123',
    },
    explicitInput: {
      something: 'hi!',
    },
    savedObjectId: 'savedObjectId',
    type: 'search',
  });
});

test('convertPanelStateToSavedDashboardPanel', () => {
  const dashboardPanel: DashboardPanelState<CustomInput> = {
    embeddableId: '123',
    gridData: {
      x: 0,
      y: 0,
      h: 15,
      w: 15,
      i: '123',
    },
    savedObjectId: 'savedObjectId',
    explicitInput: {
      something: 'hi!',
    },
    type: 'search',
  };

  expect(convertPanelStateToSavedDashboardPanel(dashboardPanel)).toEqual({
    type: 'search',
    embeddableConfig: {
      something: 'hi!',
    },
    id: 'savedObjectId',
    panelIndex: '123',
    gridData: {
      x: 0,
      y: 0,
      h: 15,
      w: 15,
      i: '123',
    },
    version: '6.3.0',
  });
});

test('convertPanelStateToSavedDashboardPanel does not include undefined savedObjectId', () => {
  const dashboardPanel: DashboardPanelState<CustomInput> = {
    embeddableId: '123',
    gridData: {
      x: 0,
      y: 0,
      h: 15,
      w: 15,
      i: '123',
    },
    explicitInput: {
      something: 'hi!',
    },
    type: 'search',
  };

  expect(convertPanelStateToSavedDashboardPanel(dashboardPanel)).toEqual({
    type: 'search',
    embeddableConfig: {
      something: 'hi!',
    },
    panelIndex: '123',
    gridData: {
      x: 0,
      y: 0,
      h: 15,
      w: 15,
      i: '123',
    },
    version: '6.3.0',
  });
});

test('convert 6.0 panel state', () => {
  const oldPanelState: Pre61SavedDashboardPanel = {
    col: 1,
    id: 'Visualization-MetricChart',
    panelIndex: 1,
    row: 1,
    size_x: 6,
    size_y: 3,
    type: 'visualization',
  };
  const converted = convertSavedDashboardPanelToPanelState(oldPanelState, false);

  expect((converted as DashboardPanelState).gridData.w).toBe(24);
  expect((converted as DashboardPanelState).gridData.h).toBe(15);
});
