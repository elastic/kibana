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

import React from 'react';
import _ from 'lodash';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { DashboardPanel } from './dashboard_panel';
import { DashboardViewMode } from '../dashboard_view_mode';
import { PanelError } from '../panel/panel_error';
import { store } from '../../store';
import { getEmbeddableFactoryMock } from '../__tests__/get_embeddable_factories_mock';

import {
  updateViewMode,
  setPanels,
  updateTimeRange,
  embeddableIsInitialized,
} from '../actions';
import { Provider } from 'react-redux';

import {
  takeMountedSnapshot,
} from '@elastic/eui/lib/test';

function getProps(props = {}) {
  const defaultTestProps = {
    panel: { panelIndex: 'foo1' },
    viewOnlyMode: false,
    destroy: () => {},
    initialized: true,
    lastReloadRequestTime: 0,
    embeddableIsInitialized: () => {},
    embeddableIsInitializing: () => {},
    embeddableStateChanged: () => {},
    embeddableError: () => {},
    embeddableFactory: getEmbeddableFactoryMock(),
  };
  return _.defaultsDeep(props, defaultTestProps);
}

beforeAll(() => {
  store.dispatch(updateTimeRange({ to: 'now', from: 'now-15m' }));
  store.dispatch(updateViewMode(DashboardViewMode.EDIT));
  store.dispatch(setPanels({ 'foo1': { panelIndex: 'foo1' } }));
  const metadata = { title: 'my embeddable title', editUrl: 'editme' };
  store.dispatch(embeddableIsInitialized({ metadata, panelId: 'foo1' }));
});

test('DashboardPanel matches snapshot', () => {
  const component = mountWithIntl(<Provider store={store}><DashboardPanel.WrappedComponent {...getProps()} /></Provider>);
  expect(takeMountedSnapshot(component)).toMatchSnapshot();
});

test('renders an error when error prop is passed', () => {
  const props = getProps({
    error: 'Simulated error'
  });

  const component = mountWithIntl(<Provider store={store}><DashboardPanel.WrappedComponent {...props} /></Provider>);
  const panelError = component.find(PanelError);
  expect(panelError.length).toBe(1);
});
