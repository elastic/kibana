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

import {
  CONTACT_CARD_EMBEDDABLE,
} from '@kbn/embeddable-plugin/public/lib/test_samples/embeddables';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { pluginServices } from '../../../services/plugin_services';
import { DashboardGrid } from './dashboard_grid';
import { getSampleDashboardInput, mockDashboardReduxEmbeddableTools } from '../../../mocks';

jest.mock('./dashboard_grid_item', () => ({
  DashboardGridItem: require('react').forwardRef((props, ref) => (
    <div ref={ref}>mockDashboardGridItem</div>
  )),
}));

const DashboardServicesProvider = pluginServices.getContextProvider();

async function prepare() {
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
  const dashboardMock = await mockDashboardReduxEmbeddableTools({ explicitInput: initialInput });

  return {
    tools: dashboardMock.tools,
    dashboardContainer: dashboardMock.dashboardContainer,
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

test('renders DashboardGrid', async () => {
  const { tools } = await prepare();

  const component = mountWithIntl(
    <DashboardServicesProvider>
      <tools.Wrapper>
        <DashboardGrid />
      </tools.Wrapper>
    </DashboardServicesProvider>
  );
  const panelElements = component.find('GridItem');
  expect(panelElements.length).toBe(2);
});

test('renders DashboardGrid with no visualizations', async () => {
  const { tools, dashboardContainer } = await prepare();
  const component = mountWithIntl(
    <DashboardServicesProvider>
      <tools.Wrapper>
        <DashboardGrid />
      </tools.Wrapper>
    </DashboardServicesProvider>
  );

  dashboardContainer.updateInput({ panels: {} });
  component.update();
  expect(component.find('GridItem').length).toBe(0);
});

test('DashboardGrid removes panel when removed from container', async () => {
  const { tools, dashboardContainer } = await prepare();
  const component = mountWithIntl(
    <DashboardServicesProvider>
      <tools.Wrapper>
        <DashboardGrid />
      </tools.Wrapper>
    </DashboardServicesProvider>
  );

  const originalPanels = dashboardContainer.getInput().panels;
  const filteredPanels = { ...originalPanels };
  delete filteredPanels['1'];
  dashboardContainer.updateInput({ panels: filteredPanels });
  component.update();
  const panelElements = component.find('GridItem');
  expect(panelElements.length).toBe(1);
});

test('DashboardGrid renders expanded panel', async () => {
  const { tools, dashboardContainer } = await prepare();
  const component = mountWithIntl(
    <DashboardServicesProvider>
      <tools.Wrapper>
        <DashboardGrid />
      </tools.Wrapper>
    </DashboardServicesProvider>
  );

  dashboardContainer.setExpandedPanelId('1');
  component.update();
  // Both panels should still exist in the dom, so nothing needs to be re-fetched once minimized.
  expect(component.find('GridItem').length).toBe(2);

  expect(
    (component.find('DashboardGridUi').state() as { expandedPanelId?: string }).expandedPanelId
  ).toBe('1');

  dashboardContainer.setExpandedPanelId();
  component.update();
  expect(component.find('GridItem').length).toBe(2);

  expect(
    (component.find('DashboardGridUi').state() as { expandedPanelId?: string }).expandedPanelId
  ).toBeUndefined();
});
