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
import { shallowWithIntl, nextTick, mountWithIntl } from 'test_utils/enzyme_helpers';
import { skip } from 'rxjs/operators';
import { EmbeddableFactory, GetEmbeddableFactory } from '../../embeddable_api';
import { DashboardGrid, DashboardGridProps } from './dashboard_grid';
import { DashboardContainer } from '../dashboard_container';
import { getSampleDashboardInput } from '../../test_helpers';
import {
  CONTACT_CARD_EMBEDDABLE,
  ContactCardEmbeddableFactory,
} from '../../../../../../../embeddable_api/public/np_ready/public/lib/test_samples/embeddables/contact_card/contact_card_embeddable_factory';

let dashboardContainer: DashboardContainer | undefined;

function getProps(props?: Partial<DashboardGridProps>): DashboardGridProps {
  const __embeddableFactories = new Map<string, EmbeddableFactory>();
  __embeddableFactories.set(CONTACT_CARD_EMBEDDABLE, new ContactCardEmbeddableFactory());
  const getFactory: GetEmbeddableFactory = (id: string) => __embeddableFactories.get(id);

  dashboardContainer = new DashboardContainer(
    getSampleDashboardInput({
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
    }),
    getFactory
  );
  const defaultTestProps: DashboardGridProps = {
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
  const panelElements = component.find('InjectIntl(EmbeddableChildPanelUi)');
  expect(panelElements.length).toBe(2);
});

test('renders DashboardGrid with no visualizations', async () => {
  const props = getProps();
  const component = shallowWithIntl(<DashboardGrid.WrappedComponent {...props} />);
  props.container.updateInput({ panels: {} });
  await nextTick();
  component.update();
  expect(component.find('InjectIntl(EmbeddableChildPanelUi)').length).toBe(0);
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
  const panelElements = component.find('InjectIntl(EmbeddableChildPanelUi)');
  expect(panelElements.length).toBe(1);
});

test('DashboardGrid renders expanded panel', async () => {
  const props = getProps();
  const component = shallowWithIntl(<DashboardGrid.WrappedComponent {...props} />);
  props.container.updateInput({ expandedPanelId: '1' });
  await nextTick();
  component.update();
  // Both panels should still exist in the dom, so nothing needs to be re-fetched once minimized.
  expect(component.find('InjectIntl(EmbeddableChildPanelUi)').length).toBe(2);

  expect((component.state() as { expandedPanelId?: string }).expandedPanelId).toBe('1');

  props.container.updateInput({ expandedPanelId: undefined });
  await nextTick();
  component.update();
  expect(component.find('InjectIntl(EmbeddableChildPanelUi)').length).toBe(2);

  expect((component.state() as { expandedPanelId?: string }).expandedPanelId).toBeUndefined();
});

test('DashboardGrid unmount unsubscribes', async done => {
  const props = getProps();
  const component = mountWithIntl(<DashboardGrid.WrappedComponent {...props} />);
  component.unmount();

  props.container
    .getInput$()
    .pipe(skip(1))
    .subscribe(() => {
      done();
    });

  props.container.updateInput({ expandedPanelId: '1' });
});
