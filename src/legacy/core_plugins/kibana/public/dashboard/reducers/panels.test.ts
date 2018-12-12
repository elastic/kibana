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

import { getPanel, getPanelType } from '../../selectors';
import { store } from '../../store';
import { updatePanel, updatePanels } from '../actions';

const originalPanelData = {
  embeddableConfig: {},
  gridData: {
    h: 0,
    i: '0',
    w: 0,
    x: 0,
    y: 0,
  },
  id: '123',
  panelIndex: '1',
  type: 'mySpecialType',
  version: '123',
};

beforeEach(() => {
  // init store
  store.dispatch(updatePanels({ '1': originalPanelData }));
});

describe('UpdatePanel', () => {
  test('updates a panel', () => {
    const newPanelData = {
      ...originalPanelData,
      gridData: {
        h: 1,
        i: '1',
        w: 10,
        x: 1,
        y: 5,
      },
    };
    store.dispatch(updatePanel(newPanelData));

    const panel = getPanel(store.getState(), '1');
    expect(panel.gridData.x).toBe(1);
    expect(panel.gridData.y).toBe(5);
    expect(panel.gridData.w).toBe(10);
    expect(panel.gridData.h).toBe(1);
    expect(panel.gridData.i).toBe('1');
  });

  test('should allow updating an array that contains fewer values', () => {
    const panelData = {
      ...originalPanelData,
      embeddableConfig: {
        columns: ['field1', 'field2', 'field3'],
      },
    };
    store.dispatch(updatePanels({ '1': panelData }));
    const newPanelData = {
      ...originalPanelData,
      embeddableConfig: {
        columns: ['field2', 'field3'],
      },
    };
    store.dispatch(updatePanel(newPanelData));

    const panel = getPanel(store.getState(), '1');
    expect(panel.embeddableConfig.columns.length).toBe(2);
    expect(panel.embeddableConfig.columns[0]).toBe('field2');
    expect(panel.embeddableConfig.columns[1]).toBe('field3');
  });
});

test('getPanelType', () => {
  expect(getPanelType(store.getState(), '1')).toBe('mySpecialType');
});
