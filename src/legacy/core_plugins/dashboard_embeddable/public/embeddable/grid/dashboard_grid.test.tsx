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
import { shallowWithIntl, nextTick } from 'test_utils/enzyme_helpers';
// @ts-ignore
import sizeMe from 'react-sizeme';

import { ViewMode, EmbeddableFactoryRegistry } from 'plugins/embeddable_api/index';

import { DashboardGrid, DashboardGridProps } from './dashboard_grid';
import {
  HelloWorldEmbeddableFactory,
  HELLO_WORLD_EMBEDDABLE,
} from 'plugins/embeddable_api/__test__';
import { DashboardContainer } from '../dashboard_container';
import { getSampleDashboardInput } from 'plugins/dashboard_embeddable/__test__';

jest.mock('ui/chrome', () => ({ getKibanaVersion: () => '6.0.0' }), { virtual: true });

jest.mock(
  'ui/notify',
  () => ({
    toastNotifications: {
      addDanger: () => {},
    },
  }),
  { virtual: true }
);

let dashboardContainer: DashboardContainer | undefined;

function getProps(props?: Partial<DashboardGridProps>): DashboardGridProps {
  const embeddableFactories = new EmbeddableFactoryRegistry();
  embeddableFactories.registerFactory(new HelloWorldEmbeddableFactory());
  dashboardContainer = new DashboardContainer(
    getSampleDashboardInput({
      panels: {
        '1': {
          gridData: { x: 0, y: 0, w: 6, h: 6, i: '1' },
          embeddableId: '1',
          type: HELLO_WORLD_EMBEDDABLE,
          explicitInput: { firstName: 'Bob' },
        },
        '2': {
          gridData: { x: 6, y: 6, w: 6, h: 6, i: '2' },
          type: HELLO_WORLD_EMBEDDABLE,
          embeddableId: '2',
          explicitInput: { firstName: 'Stacey' },
        },
      },
    }),
    embeddableFactories
  );
  const defaultTestProps: DashboardGridProps = {
    embeddableFactories,
    container: dashboardContainer,
    intl: null as any,
  };
  return Object.assign(defaultTestProps, props);
}

beforeAll(() => {
  // sizeme detects the width to be 0 in our test environment. noPlaceholder will mean that the grid contents will
  // get rendered even when width is 0, which will improve our tests.
  sizeMe.noPlaceholders = true;
});

afterAll(() => {
  sizeMe.noPlaceholders = false;
});

test('renders DashboardGrid', () => {
  const component = shallowWithIntl(<DashboardGrid.WrappedComponent {...getProps()} />);
  expect(component).toMatchSnapshot();
  const panelElements = component.find('InjectIntl(DashboardPanelUi)');
  expect(panelElements.length).toBe(2);
});

test('renders DashboardGrid with no visualizations', () => {
  const props = getProps();
  props.container.updateInput({ panels: {} });
  const component = shallowWithIntl(<DashboardGrid.WrappedComponent {...props} />);
  expect(component).toMatchSnapshot();
});

test('DashboardGrid removes panel when removed from container', async () => {
  const props = getProps();
  const component = shallowWithIntl(<DashboardGrid.WrappedComponent {...props} />);
  const originalPanels = props.container.getInput().panels;
  const filteredPanels = { ...originalPanels };
  delete filteredPanels['1'];
  props.container.updateInput({ panels: filteredPanels });
  await nextTick();
  component.update();
  const panelElements = component.find('InjectIntl(DashboardPanelUi)');
  expect(panelElements.length).toBe(1);
});
