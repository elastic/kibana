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
import { RenderResult, act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardPanelMap } from '../../../common';
import { DashboardSectionMap } from '../../../common/dashboard_container/types';
import {
  DashboardContext,
  useDashboardApi as mockUseDashboardApi,
} from '../../dashboard_api/use_dashboard_api';
import { DashboardInternalContext } from '../../dashboard_api/use_dashboard_internal_api';
import { buildMockDashboardApi } from '../../mocks';
import { DashboardGrid } from './dashboard_grid';
import type { Props as DashboardGridItemProps } from './dashboard_grid_item';

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

const PANELS: DashboardPanelMap = {
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

const PANELS_WITH_SECTIONS = {
  ...PANELS,
  '3': {
    gridData: { x: 0, y: 0, w: 6, h: 6, i: '3', sectionId: 'section1' },
    type: 'lens',
    explicitInput: { id: '3' },
  },
  '4': {
    gridData: { x: 0, y: 0, w: 6, h: 6, i: '4', sectionId: 'section2' },
    type: 'lens',
    explicitInput: { id: '4' },
  },
};

const SECTIONS: DashboardSectionMap = {
  section1: { id: 'section1', title: 'Section One', collapsed: true, order: 1 },
  section2: { id: 'section2', title: 'Section Two', collapsed: false, order: 2 },
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

const createAndMountDashboardGrid = async (overrides?: {
  panels?: DashboardPanelMap;
  sections?: DashboardSectionMap;
}) => {
  const panels = overrides?.panels ?? PANELS;
  const sections = overrides?.sections;
  const { api, internalApi } = buildMockDashboardApi({
    overrides: {
      panels,
      ...(sections && { sections }),
    },
  });

  const component = render(
    <DashboardContext.Provider value={api}>
      <DashboardInternalContext.Provider value={internalApi}>
        <DashboardGrid />
      </DashboardInternalContext.Provider>
    </DashboardContext.Provider>
  );

  // panels in collapsed sections should not render
  const panelRenderCount = sections
    ? Object.values(panels).filter((value) => {
        const sectionId = value.gridData.sectionId;
        return sectionId ? !sections[sectionId].collapsed : true;
      }).length
    : Object.keys(panels).length;

  // wait for first render
  await waitFor(() => {
    expect(component.queryAllByTestId('dashboardGridItem').length).toBe(panelRenderCount);
  });

  return { dashboardApi: api, component };
};

describe('DashboardGrid', () => {
  test('renders', async () => {
    await createAndMountDashboardGrid();
  });

  describe('panels', () => {
    test('renders with no visualizations', async () => {
      await createAndMountDashboardGrid();
    });

    test('removes panel when removed from container', async () => {
      const { dashboardApi, component } = await createAndMountDashboardGrid();

      // remove panel
      await act(async () => {
        dashboardApi.setPanels({
          '2': PANELS['2'],
        });
        await new Promise((resolve) => setTimeout(resolve, 1));
      });

      expect(component.getAllByTestId('dashboardGridItem').length).toBe(1);
    });

    test('renders expanded panel', async () => {
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

    test('renders focused panel', async () => {
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
  });

  describe('sections', () => {
    test('renders sections', async () => {
      await createAndMountDashboardGrid({
        panels: PANELS_WITH_SECTIONS,
        sections: SECTIONS,
      });

      const header1 = screen.getByTestId('kbnGridRowContainer-section1');
      expect(header1).toBeInTheDocument();
      expect(header1.classList).toContain('kbnGridRowContainer--collapsed');
      const header2 = screen.getByTestId('kbnGridRowContainer-section2');
      expect(header2).toBeInTheDocument();
      expect(header2.classList).not.toContain('kbnGridRowContainer--collapsed');
    });

    test('can add new section', async () => {
      const { dashboardApi } = await createAndMountDashboardGrid({
        panels: PANELS_WITH_SECTIONS,
        sections: SECTIONS,
      });

      dashboardApi.addNewSection();
      await waitFor(() => {
        const headers = screen.getAllByTestId(`kbnGridRowContainer-`, {
          exact: false,
        });
        expect(headers.length).toEqual(4);
      });

      const newHeader = Object.values(dashboardApi.sections$.getValue()).filter(
        ({ order }) => order === 3
      )[0];
      expect(newHeader.title).toEqual('New collapsible section');
      expect(screen.getByText(newHeader.title)).toBeInTheDocument();
      expect(newHeader.collapsed).toBe(false);
      expect(screen.getByTestId(`kbnGridRowContainer-${newHeader.id}`).classList).not.toContain(
        'kbnGridRowContainer--collapsed'
      );
    });

    test('dashboard state updates on collapse', async () => {
      const { dashboardApi } = await createAndMountDashboardGrid({
        panels: PANELS_WITH_SECTIONS,
        sections: SECTIONS,
      });

      const headerButton = screen.getByTestId(`kbnGridRowTitle-section2`);
      expect(headerButton.nodeName.toLowerCase()).toBe('button');
      userEvent.click(headerButton);
      await waitFor(() => {
        expect(dashboardApi.sections$.getValue().section2.collapsed).toBe(true);
      });
      expect(headerButton.ariaExpanded).toBe('false');
    });

    test('dashboard state updates on section deletion', async () => {
      const { dashboardApi } = await createAndMountDashboardGrid({
        panels: PANELS_WITH_SECTIONS,
        sections: {
          ...SECTIONS,
          emptySection: { id: 'emptySection', title: 'Empty section', collapsed: false, order: 3 },
        },
      });

      // can delete empty section
      let deleteButton = screen.getByTestId('kbnGridRowHeader-emptySection--delete');
      userEvent.click(deleteButton);
      await waitFor(() => {
        expect(Object.keys(dashboardApi.sections$.getValue())).not.toContain('emptySection');
      });

      // can delete non-empty section
      deleteButton = screen.getByTestId('kbnGridRowHeader-section1--delete');
      userEvent.click(deleteButton);
      await waitFor(() => {
        expect(screen.getByTestId('kbnGridLayoutDeleteRowModal-section1')).toBeInTheDocument();
      });
      const confirmDeleteButton = screen.getByText('Delete section and 1 panel');
      userEvent.click(confirmDeleteButton);
      await waitFor(() => {
        expect(Object.keys(dashboardApi.sections$.getValue())).not.toContain('section1');
        expect(Object.keys(dashboardApi.panels$.getValue())).not.toContain('3'); // this is the panel in section1
      });
    });

    test('layout responds to dashboard state update', async () => {
      const { dashboardApi } = await createAndMountDashboardGrid({
        panels: {},
        sections: {},
      });

      let sections = screen.getAllByTestId(`kbnGridRowContainer-`, {
        exact: false,
      });
      expect(sections.length).toBe(1); // only the first top section is rendered

      dashboardApi.setSections(SECTIONS);
      dashboardApi.setPanels(PANELS_WITH_SECTIONS);

      await waitFor(() => {
        sections = screen.getAllByTestId(`kbnGridRowContainer-`, {
          exact: false,
        });
        expect(sections.length).toBe(3);
        expect(screen.getAllByTestId('dashboardGridItem').length).toBe(3); // one panel is in a collapsed section
      });
    });
  });
});
