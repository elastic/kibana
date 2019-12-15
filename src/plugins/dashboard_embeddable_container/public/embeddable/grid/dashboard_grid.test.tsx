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

// @ts-ignore
import sizeMe from 'react-sizeme';

import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { skip } from 'rxjs/operators';
import { EmbeddableFactory, GetEmbeddableFactory } from '../../embeddable_plugin';
import { DashboardGrid, DashboardGridProps } from './dashboard_grid';
import { DashboardContainer, DashboardContainerOptions } from '../dashboard_container';
import { getSampleDashboardInput } from '../../test_helpers';
import {
  CONTACT_CARD_EMBEDDABLE,
  ContactCardEmbeddableFactory,
} from '../../embeddable_plugin_test_samples';
import { KibanaContextProvider } from '../../../../kibana_react/public';

let dashboardContainer: DashboardContainer | undefined;

function prepare(props?: Partial<DashboardGridProps>) {
  const embeddableFactories = new Map<string, EmbeddableFactory>();
  embeddableFactories.set(
    CONTACT_CARD_EMBEDDABLE,
    new ContactCardEmbeddableFactory({} as any, (() => {}) as any, {} as any)
  );
  const getEmbeddableFactory: GetEmbeddableFactory = (id: string) => embeddableFactories.get(id);
  const initialInput = getSampleDashboardInput({
    panels: {
      '1': {
        gridData: { x: 0, y: 0, w: 6, h: 6, i: '1' },
        type: CONTACT_CARD_EMBEDDABLE,
        explicitInput: { id: '1' },
      },
      '2': {
        gridData: { x: 6, y: 6, w: 6, h: 6, i: '2' },
        type: CONTACT_CARD_EMBEDDABLE,
        explicitInput: { id: '2' },
      },
    },
  });
  const options: DashboardContainerOptions = {
    application: {} as any,
    embeddable: {
      getTriggerCompatibleActions: (() => []) as any,
      getEmbeddableFactories: (() => []) as any,
      getEmbeddableFactory,
    } as any,
    notifications: {} as any,
    overlays: {} as any,
    inspector: {
      isAvailable: jest.fn(),
    } as any,
    SavedObjectFinder: () => null,
    ExitFullScreenButton: () => null,
    uiActions: {
      getTriggerCompatibleActions: (() => []) as any,
    } as any,
  };
  dashboardContainer = new DashboardContainer(initialInput, options);
  const defaultTestProps: DashboardGridProps = {
    container: dashboardContainer,
    kibana: null as any,
    intl: null as any,
  };

  return {
    props: Object.assign(defaultTestProps, props),
    options,
  };
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
  const { props, options } = prepare();
  const component = mountWithIntl(
    <KibanaContextProvider services={options}>
      <DashboardGrid {...props} />
    </KibanaContextProvider>
  );
  const panelElements = component.find('EmbeddableChildPanel');
  expect(panelElements.length).toBe(2);
});

test('renders DashboardGrid with no visualizations', () => {
  const { props, options } = prepare();
  const component = mountWithIntl(
    <KibanaContextProvider services={options}>
      <DashboardGrid {...props} />
    </KibanaContextProvider>
  );

  props.container.updateInput({ panels: {} });
  component.update();
  expect(component.find('EmbeddableChildPanel').length).toBe(0);
});

test('DashboardGrid removes panel when removed from container', () => {
  const { props, options } = prepare();
  const component = mountWithIntl(
    <KibanaContextProvider services={options}>
      <DashboardGrid {...props} />
    </KibanaContextProvider>
  );

  const originalPanels = props.container.getInput().panels;
  const filteredPanels = { ...originalPanels };
  delete filteredPanels['1'];
  props.container.updateInput({ panels: filteredPanels });
  component.update();
  const panelElements = component.find('EmbeddableChildPanel');
  expect(panelElements.length).toBe(1);
});

test('DashboardGrid renders expanded panel', () => {
  const { props, options } = prepare();
  const component = mountWithIntl(
    <KibanaContextProvider services={options}>
      <DashboardGrid {...props} />
    </KibanaContextProvider>
  );

  props.container.updateInput({ expandedPanelId: '1' });
  component.update();
  // Both panels should still exist in the dom, so nothing needs to be re-fetched once minimized.
  expect(component.find('EmbeddableChildPanel').length).toBe(2);

  expect(
    (component.find('DashboardGridUi').state() as { expandedPanelId?: string }).expandedPanelId
  ).toBe('1');

  props.container.updateInput({ expandedPanelId: undefined });
  component.update();
  expect(component.find('EmbeddableChildPanel').length).toBe(2);

  expect(
    (component.find('DashboardGridUi').state() as { expandedPanelId?: string }).expandedPanelId
  ).toBeUndefined();
});

test('DashboardGrid unmount unsubscribes', async done => {
  const { props, options } = prepare();
  const component = mountWithIntl(
    <KibanaContextProvider services={options}>
      <DashboardGrid {...props} />
    </KibanaContextProvider>
  );

  component.unmount();

  props.container
    .getInput$()
    .pipe(skip(1))
    .subscribe(() => {
      done();
    });

  props.container.updateInput({ expandedPanelId: '1' });
});
