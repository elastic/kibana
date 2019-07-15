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
import { findTestSubject } from '@elastic/eui/lib/test';
import React from 'react';
import { skip } from 'rxjs/operators';
import { mount } from 'enzyme';
import { I18nProvider } from '@kbn/i18n/react';
import { nextTick } from 'test_utils/enzyme_helpers';
import { EmbeddableFactory, GetEmbeddableFactory } from '../../embeddable_api';
import { DashboardViewport, DashboardViewportProps } from './dashboard_viewport';
import { DashboardContainer } from '../dashboard_container';
import { getSampleDashboardInput } from '../../test_helpers';
import {
  CONTACT_CARD_EMBEDDABLE,
  ContactCardEmbeddableFactory,
} from '../../../../../../../embeddable_api/public/np_ready/public/lib/test_samples/embeddables/contact_card/contact_card_embeddable_factory';

let dashboardContainer: DashboardContainer | undefined;

function getProps(props?: Partial<DashboardViewportProps>): DashboardViewportProps {
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
  const defaultTestProps: DashboardViewportProps = {
    container: dashboardContainer,
  };
  return Object.assign(defaultTestProps, props);
}

test('renders DashboardViewport', () => {
  const props = getProps();
  const component = mount(
    <I18nProvider>
      <DashboardViewport {...props} />
    </I18nProvider>
  );
  const panels = findTestSubject(component, 'dashboardPanel');
  expect(panels.length).toBe(2);
});

test('renders DashboardViewport with no visualizations', () => {
  const props = getProps();
  props.container.updateInput({ panels: {} });
  const component = mount(
    <I18nProvider>
      <DashboardViewport {...props} />
    </I18nProvider>
  );
  const panels = findTestSubject(component, 'dashboardPanel');
  expect(panels.length).toBe(0);

  component.unmount();
});

test('renders exit full screen button when in full screen mode', async () => {
  const props = getProps();
  props.container.updateInput({ isFullScreenMode: true });
  const component = mount(
    <I18nProvider>
      <DashboardViewport {...props} />
    </I18nProvider>
  );
  let exitButton = findTestSubject(component, 'exitFullScreenModeText');
  expect(exitButton.length).toBe(1);

  props.container.updateInput({ isFullScreenMode: false });

  await nextTick();
  component.update();

  exitButton = findTestSubject(component, 'exitFullScreenModeText');
  expect(exitButton.length).toBe(0);

  component.unmount();
});

test('DashboardViewport unmount unsubscribes', async done => {
  const props = getProps();
  const component = mount(
    <I18nProvider>
      <DashboardViewport {...props} />
    </I18nProvider>
  );
  component.unmount();

  props.container
    .getInput$()
    .pipe(skip(1))
    .subscribe(() => {
      done();
    });

  props.container.updateInput({ panels: {} });
});
