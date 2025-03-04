/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { useBatchedPublishingSubjects as mockUseBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { DashboardPanelMap } from '../../../../common';
import {
  DashboardContext,
  useDashboardApi as mockUseDashboardApi,
} from '../../../dashboard_api/use_dashboard_api';
import { DashboardInternalContext } from '../../../dashboard_api/use_dashboard_internal_api';
import { buildMockDashboardApi } from '../../../mocks';
import { DashboardGrid } from './dashboard_grid';
import type { Props as DashboardGridItemProps } from './dashboard_grid_item';
import { RenderResult, act, render, waitFor } from '@testing-library/react';

jest.mock('./dashboard_grid_item', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    DashboardGridItem: require('react').forwardRef(
      (props: DashboardGridItemProps, ref: HTMLDivElement) => {
        const dashboardApi = mockUseDashboardApi();

        const [expandedPanelId, focusedPanelId] = mockUseBatchedPublishingSubjects(
          dashboardApi.expandedPanelId$,
          dashboardApi.focusedPanelId$
        );

        const className = `${
          expandedPanelId === undefined
            ? 'regularPanel'
            : expandedPanelId === props.id
            ? 'expandedPanel'
            : 'hiddenPanel'
        } ${focusedPanelId ? (focusedPanelId === props.id ? 'focusedPanel' : 'blurredPanel') : ''}`;

        return (
          <div
            data-test-subj="dashboardGridItem"
            id={`mockDashboardGridItem_${props.id}`}
            className={className}
          >
            mockDashboardGridItem
          </div>
        );
      }
    ),
  };
});

const PANELS = {
  '1': {
    gridData: { x: 0, y: 0, w: 6, h: 6, i: '1' },
    type: 'lens',
    explicitInput: { id: '1' },
  },
  '2': {
    gridData: { x: 6, y: 6, w: 6, h: 6, i: '2' },
    type: 'lens',
    explicitInput: { id: '2' },
  },
};

const verifyElementHasClass = (
  component: RenderResult,
  elementSelector: string,
  className: string
) => {
  const itemToCheck = component.container.querySelector(elementSelector);
  expect(itemToCheck).toBeDefined();
  expect(itemToCheck!.classList.contains(className)).toBe(true);
};

const createAndMountDashboardGrid = async (panels: DashboardPanelMap = PANELS) => {
  const { api, internalApi } = buildMockDashboardApi({
    overrides: {
      panels,
    },
  });
  const component = render(
    <DashboardContext.Provider value={api}>
      <DashboardInternalContext.Provider value={internalApi}>
        <DashboardGrid />
      </DashboardInternalContext.Provider>
    </DashboardContext.Provider>
  );

  // wait for first render
  await waitFor(() => {
    expect(component.queryAllByTestId('dashboardGridItem').length).toBe(Object.keys(panels).length);
  });

  return { dashboardApi: api, component };
};

test('renders DashboardGrid', async () => {
  await createAndMountDashboardGrid(PANELS);
});

test('renders DashboardGrid with no visualizations', async () => {
  await createAndMountDashboardGrid({});
});

test('DashboardGrid removes panel when removed from container', async () => {
  const { dashboardApi, component } = await createAndMountDashboardGrid(PANELS);

  // remove panel
  await act(async () => {
    dashboardApi.setPanels({
      '2': PANELS['2'],
    });
    await new Promise((resolve) => setTimeout(resolve, 1));
  });

  expect(component.getAllByTestId('dashboardGridItem').length).toBe(1);
});

test('DashboardGrid renders expanded panel', async () => {
  const { dashboardApi, component } = await createAndMountDashboardGrid();

  // maximize panel
  await act(async () => {
    dashboardApi.expandPanel('1');
    await new Promise((resolve) => setTimeout(resolve, 1));
  });
  // Both panels should still exist in the dom, so nothing needs to be re-fetched once minimized.
  expect(component.getAllByTestId('dashboardGridItem').length).toBe(2);

  verifyElementHasClass(component, '#mockDashboardGridItem_1', 'expandedPanel');
  verifyElementHasClass(component, '#mockDashboardGridItem_2', 'hiddenPanel');

  // minimize panel
  await act(async () => {
    dashboardApi.expandPanel('1');
    await new Promise((resolve) => setTimeout(resolve, 1));
  });
  expect(component.getAllByTestId('dashboardGridItem').length).toBe(2);

  verifyElementHasClass(component, '#mockDashboardGridItem_1', 'regularPanel');
  verifyElementHasClass(component, '#mockDashboardGridItem_2', 'regularPanel');
});

test('DashboardGrid renders focused panel', async () => {
  const { dashboardApi, component } = await createAndMountDashboardGrid();
  const overlayMock = {
    onClose: new Promise<void>((resolve) => {
      resolve();
    }),
    close: async () => {},
  };

  await act(async () => {
    dashboardApi.openOverlay(overlayMock, { focusedPanelId: '2' });
    await new Promise((resolve) => setTimeout(resolve, 1));
  });
  // Both panels should still exist in the dom, so nothing needs to be re-fetched once focused/blurred.
  expect(component.getAllByTestId('dashboardGridItem').length).toBe(2);

  verifyElementHasClass(component, '#mockDashboardGridItem_1', 'blurredPanel');
  verifyElementHasClass(component, '#mockDashboardGridItem_2', 'focusedPanel');

  await act(async () => {
    dashboardApi.clearOverlays();
    await new Promise((resolve) => setTimeout(resolve, 1));
  });
  expect(component.getAllByTestId('dashboardGridItem').length).toBe(2);

  verifyElementHasClass(component, '#mockDashboardGridItem_1', 'regularPanel');
  verifyElementHasClass(component, '#mockDashboardGridItem_2', 'regularPanel');
});
