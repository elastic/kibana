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
import { EmbeddableFactory } from '../../embeddable_plugin';
import { DashboardViewport, DashboardViewportProps } from './dashboard_viewport';
import { DashboardContainer, DashboardContainerOptions } from '../dashboard_container';
import { getSampleDashboardInput } from '../../test_helpers';
import {
  CONTACT_CARD_EMBEDDABLE,
  ContactCardEmbeddableFactory,
} from '../../embeddable_plugin_test_samples';
import { KibanaContextProvider } from '../../../../../plugins/kibana_react/public';

let dashboardContainer: DashboardContainer | undefined;

const ExitFullScreenButton = () => <div data-test-subj="exitFullScreenModeText">EXIT</div>;

function getProps(
  props?: Partial<DashboardViewportProps>
): { props: DashboardViewportProps; options: DashboardContainerOptions } {
  const embeddableFactories = new Map<string, EmbeddableFactory>();
  embeddableFactories.set(
    CONTACT_CARD_EMBEDDABLE,
    new ContactCardEmbeddableFactory({}, (() => null) as any, {} as any)
  );

  const options: DashboardContainerOptions = {
    application: {} as any,
    embeddable: {
      getTriggerCompatibleActions: (() => []) as any,
      getEmbeddableFactories: (() => []) as any,
      getEmbeddableFactory: (id: string) => embeddableFactories.get(id),
    } as any,
    notifications: {} as any,
    overlays: {} as any,
    inspector: {
      isAvailable: jest.fn(),
    } as any,
    SavedObjectFinder: () => null,
    ExitFullScreenButton,
    uiActions: {
      getTriggerCompatibleActions: (() => []) as any,
    } as any,
  };

  const input = getSampleDashboardInput({
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

  dashboardContainer = new DashboardContainer(input, options);
  const defaultTestProps: DashboardViewportProps = {
    container: dashboardContainer,
  };

  return {
    props: Object.assign(defaultTestProps, props),
    options,
  };
}

test('renders DashboardViewport', () => {
  const { props, options } = getProps();
  const component = mount(
    <I18nProvider>
      <KibanaContextProvider services={options}>
        <DashboardViewport {...props} />
      </KibanaContextProvider>
    </I18nProvider>
  );
  const panels = findTestSubject(component, 'dashboardPanel');
  expect(panels.length).toBe(2);
});

test('renders DashboardViewport with no visualizations', () => {
  const { props, options } = getProps();
  props.container.updateInput({ panels: {} });
  const component = mount(
    <I18nProvider>
      <KibanaContextProvider services={options}>
        <DashboardViewport {...props} />
      </KibanaContextProvider>
    </I18nProvider>
  );
  const panels = findTestSubject(component, 'dashboardPanel');
  expect(panels.length).toBe(0);

  component.unmount();
});

test('renders DashboardEmptyScreen', () => {
  const renderEmptyScreen = jest.fn();
  const { props, options } = getProps({ renderEmpty: renderEmptyScreen });
  props.container.updateInput({ isEmptyState: true });
  const component = mount(
    <I18nProvider>
      <KibanaContextProvider services={options}>
        <DashboardViewport {...props} />
      </KibanaContextProvider>
    </I18nProvider>
  );
  const dashboardEmptyScreenDiv = component.find('.dshDashboardEmptyScreen');
  expect(dashboardEmptyScreenDiv.length).toBe(1);
  expect(renderEmptyScreen).toHaveBeenCalled();

  component.unmount();
});

test('renders exit full screen button when in full screen mode', async () => {
  const { props, options } = getProps();
  props.container.updateInput({ isFullScreenMode: true });
  const component = mount(
    <I18nProvider>
      <KibanaContextProvider services={options}>
        <DashboardViewport {...props} />
      </KibanaContextProvider>
    </I18nProvider>
  );

  expect(
    (component
      .find('.dshDashboardViewport')
      .childAt(0)
      .type() as any).name
  ).toBe('ExitFullScreenButton');

  props.container.updateInput({ isFullScreenMode: false });
  component.update();
  await nextTick();

  expect(
    (component
      .find('.dshDashboardViewport')
      .childAt(0)
      .type() as any).name
  ).not.toBe('ExitFullScreenButton');

  component.unmount();
});

test('renders exit full screen button when in full screen mode and empty screen', async () => {
  const renderEmptyScreen = jest.fn();
  renderEmptyScreen.mockReturnValue(React.createElement('div'));
  const { props, options } = getProps({ renderEmpty: renderEmptyScreen });
  props.container.updateInput({ isEmptyState: true, isFullScreenMode: true });
  const component = mount(
    <I18nProvider>
      <KibanaContextProvider services={options}>
        <DashboardViewport {...props} />
      </KibanaContextProvider>
    </I18nProvider>
  );
  expect(
    (component
      .find('.dshDashboardEmptyScreen')
      .childAt(0)
      .type() as any).name
  ).toBe('ExitFullScreenButton');

  props.container.updateInput({ isFullScreenMode: false });
  component.update();
  await nextTick();

  expect(
    (component
      .find('.dshDashboardEmptyScreen')
      .childAt(0)
      .type() as any).name
  ).not.toBe('ExitFullScreenButton');

  component.unmount();
});

test('DashboardViewport unmount unsubscribes', async done => {
  const { props, options } = getProps();
  const component = mount(
    <I18nProvider>
      <KibanaContextProvider services={options}>
        <DashboardViewport {...props} />
      </KibanaContextProvider>
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
