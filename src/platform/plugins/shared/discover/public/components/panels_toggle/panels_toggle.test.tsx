/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import userEvent from '@testing-library/user-event';
import { BehaviorSubject } from 'rxjs';
import { getDiscoverInternalStateMock } from '../../__mocks__/discover_state.mock';
import { PanelsToggle, type PanelsToggleProps } from './panels_toggle';
import type { SidebarToggleState } from '../../application/types';
import { DiscoverToolkitTestProvider } from '../../__mocks__/test_provider';
import { internalStateActions } from '../../application/main/state_management/redux';

describe('Panels toggle component', () => {
  const renderComponent = async ({
    sidebarToggleState$,
    omitChartButton, // this tells us if we have a chart available or not (for example time based vs non-time based data)
    omitTableButton, // this tells us if we have a table available or not (for no data/error)
    hideChart, // this tells us if the chart is currently collapsed or not
    hideTable, // this tells us if the table is currently collapsed or not
  }: PanelsToggleProps & { hideChart: boolean; hideTable: boolean }) => {
    const toolkit = getDiscoverInternalStateMock();

    await toolkit.initializeTabs();
    await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });

    toolkit.internalState.dispatch(
      internalStateActions.setAppState({
        tabId: toolkit.getCurrentTab().id,
        appState: { hideChart, hideTable },
      })
    );

    renderWithKibanaRenderContext(
      <DiscoverToolkitTestProvider toolkit={toolkit}>
        <PanelsToggle
          sidebarToggleState$={sidebarToggleState$}
          omitChartButton={omitChartButton}
          omitTableButton={omitTableButton}
        />
      </DiscoverToolkitTestProvider>
    );
  };

  it('should render correctly when sidebar is visible and histogram is visible', async () => {
    const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
      isCollapsed: false,
      toggle: jest.fn(),
    });
    await renderComponent({
      hideChart: false,
      hideTable: false,
      omitChartButton: false,
      omitTableButton: false,
      sidebarToggleState$,
    });

    expect(screen.getByTestId('dscHideSidebarButton')).toBeVisible();
    expect(screen.queryByTestId('dscShowSidebarButton')).not.toBeInTheDocument();

    expect(screen.getByTestId('dscHideHistogramButton')).toBeVisible();
    expect(screen.queryByTestId('dscShowHistogramButton')).not.toBeInTheDocument();

    expect(screen.getByTestId('dscHideTableButton')).toBeVisible();
    expect(screen.queryByTestId('dscShowTableButton')).not.toBeInTheDocument();
  });

  it('should render correctly when sidebar is collapsed and histogram is visible', async () => {
    const user = userEvent.setup();
    const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
      isCollapsed: true,
      toggle: jest.fn(),
    });
    await renderComponent({
      hideChart: false,
      hideTable: false,
      omitChartButton: false,
      omitTableButton: false,
      sidebarToggleState$,
    });

    expect(screen.getByTestId('dscShowSidebarButton')).toBeVisible();
    expect(screen.queryByTestId('dscHideSidebarButton')).not.toBeInTheDocument();

    expect(screen.getByTestId('dscHideHistogramButton')).toBeVisible();
    expect(screen.queryByTestId('dscShowHistogramButton')).not.toBeInTheDocument();

    expect(screen.getByTestId('dscHideTableButton')).toBeVisible();
    expect(screen.queryByTestId('dscShowTableButton')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('dscShowSidebarButton'));

    expect(sidebarToggleState$.getValue().toggle).toHaveBeenCalledWith(false);
  });

  it('should render correctly when sidebar is visible and chart/table toggles are omitted', async () => {
    const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
      isCollapsed: false,
      toggle: jest.fn(),
    });
    await renderComponent({
      hideChart: false,
      hideTable: false,
      omitChartButton: true,
      omitTableButton: true,
      sidebarToggleState$,
    });

    expect(screen.getByTestId('dscHideSidebarButton')).toBeVisible();
    expect(screen.queryByTestId('dscShowSidebarButton')).not.toBeInTheDocument();

    expect(screen.queryByTestId('dscHideHistogramButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dscShowHistogramButton')).not.toBeInTheDocument();

    expect(screen.queryByTestId('dscHideTableButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dscShowTableButton')).not.toBeInTheDocument();
  });

  it('should render correctly when both sidebar and histogram are collapsed', async () => {
    const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
      isCollapsed: true,
      toggle: jest.fn(),
    });
    await renderComponent({
      hideChart: true,
      hideTable: false,
      omitChartButton: false,
      omitTableButton: false,
      sidebarToggleState$,
    });

    expect(screen.queryByTestId('dscHideSidebarButton')).not.toBeInTheDocument();
    expect(screen.getByTestId('dscShowSidebarButton')).toBeVisible();

    expect(screen.queryByTestId('dscHideHistogramButton')).not.toBeInTheDocument();
    expect(screen.getByTestId('dscShowHistogramButton')).toBeVisible();

    expect(screen.getByTestId('dscHideTableButton')).toBeVisible();
    expect(screen.queryByTestId('dscShowTableButton')).not.toBeInTheDocument();
  });

  it('should render correctly when sidebar is collapsed and chart/table toggles are omitted', async () => {
    const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
      isCollapsed: true,
      toggle: jest.fn(),
    });
    await renderComponent({
      hideChart: false,
      hideTable: false,
      omitChartButton: true,
      omitTableButton: true,
      sidebarToggleState$,
    });

    expect(screen.queryByTestId('dscHideSidebarButton')).not.toBeInTheDocument();
    expect(screen.getByTestId('dscShowSidebarButton')).toBeVisible();

    expect(screen.queryByTestId('dscHideHistogramButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dscShowHistogramButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dscHideTableButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dscShowTableButton')).not.toBeInTheDocument();
  });

  it('should disable chart collapse when table is collapsed', async () => {
    const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
      isCollapsed: false,
      toggle: jest.fn(),
    });
    await renderComponent({
      hideChart: false,
      hideTable: true,
      omitChartButton: false,
      omitTableButton: false,
      sidebarToggleState$,
    });

    expect(screen.getByTestId('dscHideHistogramButton')).toBeDisabled();
  });

  it('should disable table collapse when chart is collapsed', async () => {
    const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
      isCollapsed: false,
      toggle: jest.fn(),
    });
    await renderComponent({
      hideChart: true,
      hideTable: false,
      omitChartButton: false,
      omitTableButton: false,
      sidebarToggleState$,
    });

    expect(screen.getByTestId('dscHideTableButton')).toBeDisabled();
  });
});
