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
import {
  maximizePanel,
  minimizePanel,
  updateIsFullScreenMode,
  updateViewMode,
} from '../actions';

import {
  getFullScreenMode,
  getMaximizedPanelId,
  getViewMode,
} from '../../selectors';

import { DashboardViewMode } from '../dashboard_view_mode';

describe('isFullScreenMode', () => {
  test('updates to true', () => {
    store.dispatch(updateIsFullScreenMode(true));
    const fullScreenMode = getFullScreenMode(store.getState());
    expect(fullScreenMode).toBe(true);
  });

  test('updates to false', () => {
    store.dispatch(updateIsFullScreenMode(false));
    const fullScreenMode = getFullScreenMode(store.getState());
    expect(fullScreenMode).toBe(false);
  });
});

describe('viewMode', () => {
  test('updates to EDIT', () => {
    store.dispatch(updateViewMode(DashboardViewMode.EDIT));
    const viewMode = getViewMode(store.getState());
    expect(viewMode).toBe(DashboardViewMode.EDIT);
  });

  test('updates to VIEW', () => {
    store.dispatch(updateViewMode(DashboardViewMode.VIEW));
    const viewMode = getViewMode(store.getState());
    expect(viewMode).toBe(DashboardViewMode.VIEW);
  });
});

describe('maximizedPanelId', () => {
  test('updates to an id when maximized', () => {
    store.dispatch(maximizePanel('1'));
    const maximizedId = getMaximizedPanelId(store.getState());
    expect(maximizedId).toBe('1');
  });

  test('updates to an id when minimized', () => {
    store.dispatch(minimizePanel());
    const maximizedId = getMaximizedPanelId(store.getState());
    expect(maximizedId).toBe(undefined);
  });
});
