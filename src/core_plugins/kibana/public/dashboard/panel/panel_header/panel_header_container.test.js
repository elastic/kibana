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
import { Provider } from 'react-redux';
import _ from 'lodash';
import { mount } from 'enzyme';

import { PanelHeaderContainer } from './panel_header_container';
import { DashboardViewMode } from '../../dashboard_view_mode';
import { store } from '../../../store';
import {
  updateViewMode,
  setPanels,
  setPanelTitle,
  resetPanelTitle,
  embeddableIsInitialized,
  updateTimeRange,
} from '../../actions';
import { findTestSubject } from '@elastic/eui/lib/test';

function getProps(props = {}) {
  const defaultTestProps = {
    panelId: 'foo1',
  };
  return _.defaultsDeep(props, defaultTestProps);
}

let component;

beforeAll(() => {
  store.dispatch(updateTimeRange({ to: 'now', from: 'now-15m' }));
  store.dispatch(updateViewMode(DashboardViewMode.EDIT));
  store.dispatch(setPanels({ 'foo1': { panelIndex: 'foo1' } }));
  const metadata = { title: 'my embeddable title', editUrl: 'editme' };
  store.dispatch(embeddableIsInitialized({ metadata, panelId: 'foo1' }));
});

afterAll(() => {
  component.unmount();
});

test('Panel header shows embeddable title when nothing is set on the panel', () => {
  component = mount(<Provider store={store}><PanelHeaderContainer {...getProps()} /></Provider>);
  expect(findTestSubject(component, 'dashboardPanelTitle').text()).toBe('my embeddable title');
});

test('Panel header shows panel title when it is set on the panel', () => {
  store.dispatch(setPanelTitle({ title: 'my custom panel title', panelId: 'foo1' }));
  expect(findTestSubject(component, 'dashboardPanelTitle').text()).toBe('my custom panel title');
});

test('Panel header shows no panel title when it is set to an empty string on the panel', () => {
  store.dispatch(setPanelTitle({ title: '', panelId: 'foo1' }));
  expect(findTestSubject(component, 'dashboardPanelTitle').text()).toBe('');
});

test('Panel header shows embeddable title when the panel title is reset', () => {
  store.dispatch(resetPanelTitle('foo1'));
  expect(findTestSubject(component, 'dashboardPanelTitle').text()).toBe('my embeddable title');
});
