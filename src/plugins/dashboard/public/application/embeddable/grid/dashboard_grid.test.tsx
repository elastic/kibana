/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// @ts-ignore
import sizeMe from 'react-sizeme';

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { skip } from 'rxjs/operators';
import { DashboardGrid, DashboardGridProps } from './dashboard_grid';
import { DashboardContainer, DashboardContainerServices } from '../dashboard_container';
import { getSampleDashboardInput } from '../../test_helpers';
import { KibanaContextProvider } from '../../../services/kibana_react';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import {
  CONTACT_CARD_EMBEDDABLE,
  ContactCardEmbeddableFactory,
} from '../../../services/embeddable_test_samples';
import { coreMock, uiSettingsServiceMock } from '@kbn/core/public/mocks';
import { getStubPluginServices } from '@kbn/presentation-util-plugin/public';
import { screenshotModePluginMock } from '@kbn/screenshot-mode-plugin/public/mocks';

let dashboardContainer: DashboardContainer | undefined;
const presentationUtil = getStubPluginServices();

function prepare(props?: Partial<DashboardGridProps>) {
  const { setup, doStart } = embeddablePluginMock.createInstance();
  setup.registerEmbeddableFactory(
    CONTACT_CARD_EMBEDDABLE,
    new ContactCardEmbeddableFactory((() => null) as any, {} as any)
  );
  const start = doStart();

  const getEmbeddableFactory = start.getEmbeddableFactory;
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
  const options: DashboardContainerServices = {
    application: {} as any,
    embeddable: {
      getTriggerCompatibleActions: (() => []) as any,
      getEmbeddableFactories: start.getEmbeddableFactories,
      getEmbeddablePanel: jest.fn(),
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
    uiSettings: uiSettingsServiceMock.createStartContract(),
    http: coreMock.createStart().http,
    theme: coreMock.createStart().theme,
    presentationUtil,
    screenshotMode: screenshotModePluginMock.createSetupContract(),
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

// unhandled promise rejection: https://github.com/elastic/kibana/issues/112699
test.skip('renders DashboardGrid', () => {
  const { props, options } = prepare();
  const component = mountWithIntl(
    <KibanaContextProvider services={options}>
      <presentationUtil.ContextProvider>
        <DashboardGrid {...props} />
      </presentationUtil.ContextProvider>
    </KibanaContextProvider>
  );
  const panelElements = component.find('EmbeddableChildPanel');
  expect(panelElements.length).toBe(2);
});

// unhandled promise rejection: https://github.com/elastic/kibana/issues/112699
test.skip('renders DashboardGrid with no visualizations', () => {
  const { props, options } = prepare();
  const component = mountWithIntl(
    <KibanaContextProvider services={options}>
      <presentationUtil.ContextProvider>
        <DashboardGrid {...props} />
      </presentationUtil.ContextProvider>
    </KibanaContextProvider>
  );

  props.container.updateInput({ panels: {} });
  component.update();
  expect(component.find('EmbeddableChildPanel').length).toBe(0);
});

// unhandled promise rejection: https://github.com/elastic/kibana/issues/112699
test.skip('DashboardGrid removes panel when removed from container', () => {
  const { props, options } = prepare();
  const component = mountWithIntl(
    <KibanaContextProvider services={options}>
      <presentationUtil.ContextProvider>
        <DashboardGrid {...props} />
      </presentationUtil.ContextProvider>
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

// unhandled promise rejection: https://github.com/elastic/kibana/issues/112699
test.skip('DashboardGrid renders expanded panel', () => {
  const { props, options } = prepare();
  const component = mountWithIntl(
    <KibanaContextProvider services={options}>
      <presentationUtil.ContextProvider>
        <DashboardGrid {...props} />
      </presentationUtil.ContextProvider>
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

// unhandled promise rejection: https://github.com/elastic/kibana/issues/112699
test.skip('DashboardGrid unmount unsubscribes', async (done) => {
  const { props, options } = prepare();
  const component = mountWithIntl(
    <KibanaContextProvider services={options}>
      <presentationUtil.ContextProvider>
        <DashboardGrid {...props} />
      </presentationUtil.ContextProvider>
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
