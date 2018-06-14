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

import { store } from '../../store';
import { updatePanel, updatePanels } from '../actions';
import {
  getPanel,
  getPanelType,
} from '../../selectors';

test('UpdatePanel updates a panel', () => {
  store.dispatch(updatePanels([{ panelIndex: '1', gridData: {} }]));

  store.dispatch(updatePanel({
    panelIndex: '1',
    type: 'mySpecialType',
    gridData: {
      x: 1,
      y: 5,
      w: 10,
      h: 1,
      id: '1'
    }
  }));

  const panel = getPanel(store.getState(), '1');
  expect(panel.gridData.x).toBe(1);
  expect(panel.gridData.y).toBe(5);
  expect(panel.gridData.w).toBe(10);
  expect(panel.gridData.h).toBe(1);
  expect(panel.gridData.id).toBe('1');
});

test('getPanelType', () => {
  expect(getPanelType(store.getState(), '1')).toBe('mySpecialType');
});
