/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiThemeProvider } from '@elastic/eui';
import { useBatchedPublishingSubjects as mockUseBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { RenderResult, act, getByLabelText, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DashboardPanelMap, DashboardSectionMap } from '../../../common';
import {
  DashboardContext,
  useDashboardApi as mockUseDashboardApi,
} from '../../dashboard_api/use_dashboard_api';
import { DashboardInternalContext } from '../../dashboard_api/use_dashboard_internal_api';
import { buildMockDashboardApi, getMockDashboardPanels } from '../../mocks';
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
  const panels = overrides?.panels ?? getMockDashboardPanels().panels;
  const sections = overrides?.sections;
  const { api, internalApi } = buildMockDashboardApi({
    overrides: {
      panels,
      ...(sections && { sections }),
    },
  });
  const component = render(
    <EuiThemeProvider>
      <DashboardContext.Provider value={api}>
        <DashboardInternalContext.Provider value={internalApi}>
          <DashboardGrid />
        </DashboardInternalContext.Provider>
      </DashboardContext.Provider>
    </EuiThemeProvider>
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

  return { dashboardApi: api, internalApi, component };
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
        dashboardApi.removePanel('2');
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
      const { panels, sections } = getMockDashboardPanels(true);
      await createAndMountDashboardGrid({
        panels,
        sections,
      });

      const header1 = screen.getByTestId('kbnGridSectionHeader-section1');
      expect(header1).toBeInTheDocument();
      expect(header1.classList).toContain('kbnGridSectionHeader--collapsed');
      const header2 = screen.getByTestId('kbnGridSectionHeader-section2');
      expect(header2).toBeInTheDocument();
      expect(header2.classList).not.toContain('kbnGridSectionHeader--collapsed');
    });

    test('can add new section', async () => {
      const { panels, sections } = getMockDashboardPanels(true);
      const { dashboardApi, internalApi } = await createAndMountDashboardGrid({
        panels,
        sections,
      });
      dashboardApi.addNewSection();
      await waitFor(() => {
        const headers = screen.getAllByLabelText('Edit section title'); // aria-label
        expect(headers.length).toEqual(3);
      });

      const newHeader = Object.values(internalApi.layout$.getValue().sections).filter(
        ({ gridData: { y } }) => y === 8
      )[0];

      expect(newHeader.title).toEqual('New collapsible section');
      expect(screen.getByText(newHeader.title)).toBeInTheDocument();
      expect(newHeader.collapsed).toBe(false);
      expect(screen.getByTestId(`kbnGridSectionHeader-${newHeader.id}`).classList).not.toContain(
        'kbnGridSectionHeader--collapsed'
      );
    });

    test('dashboard state updates on collapse', async () => {
      const { panels, sections } = getMockDashboardPanels(true);
      const { internalApi } = await createAndMountDashboardGrid({
        panels,
        sections,
      });

      const headerButton = screen.getByTestId(`kbnGridSectionTitle-section2`);
      expect(headerButton.nodeName.toLowerCase()).toBe('button');
      userEvent.click(headerButton);
      await waitFor(() => {
        expect(internalApi.layout$.getValue().sections.section2.collapsed).toBe(true);
      });
      expect(headerButton.getAttribute('aria-expanded')).toBe('false');
    });

    test('dashboard state updates on section deletion', async () => {
      const { panels, sections } = getMockDashboardPanels(true, {
        sections: {
          emptySection: {
            id: 'emptySection',
            title: 'Empty section',
            collapsed: false,
            gridData: { i: 'emptySection', y: 8 },
          },
        },
      });

      const { internalApi } = await createAndMountDashboardGrid({
        panels,
        sections,
      });

      // can delete empty section
      const deleteEmptySectionButton = getByLabelText(
        screen.getByTestId('kbnGridSectionHeader-emptySection'),
        'Delete section'
      );
      await act(async () => {
        await userEvent.click(deleteEmptySectionButton);
      });
      await waitFor(() => {
        expect(Object.keys(internalApi.layout$.getValue().sections)).not.toContain('emptySection');
      });

      // can delete non-empty section
      const deleteSection1Button = getByLabelText(
        screen.getByTestId('kbnGridSectionHeader-section1'),
        'Delete section'
      );
      await userEvent.click(deleteSection1Button);
      await waitFor(() => {
        expect(screen.getByTestId('kbnGridLayoutDeleteSectionModal-section1')).toBeInTheDocument();
      });

      const confirmDeleteButton = screen.getByText('Delete section and 1 panel');
      await userEvent.click(confirmDeleteButton);
      await waitFor(() => {
        expect(Object.keys(internalApi.layout$.getValue().sections)).not.toContain('section1');
        expect(Object.keys(internalApi.layout$.getValue().panels)).not.toContain('3'); // this is the panel in section1
      });
    });

    test('layout responds to dashboard state update', async () => {
      const withoutSections = getMockDashboardPanels();
      const withSections = getMockDashboardPanels(true);

      const { internalApi } = await createAndMountDashboardGrid({
        panels: withoutSections.panels,
        sections: {},
      });

      let sectionContainers = screen.getAllByTestId(`kbnGridSectionWrapper-`, {
        exact: false,
      });
      expect(sectionContainers.length).toBe(1); // only the first top section is rendered

      internalApi.layout$.next(withSections);

      await waitFor(() => {
        sectionContainers = screen.getAllByTestId(`kbnGridSectionWrapper-`, {
          exact: false,
        });
        expect(sectionContainers.length).toBe(2); // section wrappers are not rendered for collapsed sections
        expect(screen.getAllByTestId('dashboardGridItem').length).toBe(3); // one panel is in a collapsed section
      });
    });
  });
});
