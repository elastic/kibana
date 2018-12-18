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
import { DashboardPanelContainer } from './dashboard_panel_container';
import { DashboardViewMode } from '../dashboard_view_mode';
import { PanelError } from '../panel/panel_error';
import { store } from '../../store';
import {
  updateViewMode,
  setPanels, updateTimeRange,
} from '../actions';
import { Provider } from 'react-redux';
import { getEmbeddableFactoryMock } from '../__tests__/get_embeddable_factories_mock';

function getProps(props = {}) {
  const defaultTestProps = {
    panelId: 'foo1',
    embeddableFactory: getEmbeddableFactoryMock(),
  };
  return _.defaultsDeep(props, defaultTestProps);
}

beforeAll(() => {
  store.dispatch(updateViewMode(DashboardViewMode.EDIT));
  store.dispatch(updateTimeRange({ to: 'now', from: 'now-15m' }));
  store.dispatch(setPanels({ 'foo1': { panelIndex: 'foo1' } }));
});

test('renders an error when embeddableFactory.create throws an error', (done) => {
  const props = getProps();
  props.embeddableFactory.create = () => {
    return new Promise(() => {
      throw new Error('simulated error');
    });
  };
  const component = mountWithIntl(<Provider store={store}><DashboardPanelContainer {...props} /></Provider>);
  setTimeout(() => {
    component.update();
    const panelError = component.find(PanelError);
    expect(panelError.length).toBe(1);
    done();
  }, 0);
});

