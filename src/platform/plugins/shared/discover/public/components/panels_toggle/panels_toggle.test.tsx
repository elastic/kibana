/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import { waitFor } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { act } from 'react-dom/test-utils';
import { getDiscoverInternalStateMock } from '../../__mocks__/discover_state.mock';
import { PanelsToggle, type PanelsToggleProps } from './panels_toggle';
import type { SidebarToggleState } from '../../application/types';
import { DiscoverToolkitTestProvider } from '../../__mocks__/test_provider';
import { internalStateActions } from '../../application/main/state_management/redux';

describe('Panels toggle component', () => {
  const mountComponent = async ({
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

    const component = mountWithIntl(
      <DiscoverToolkitTestProvider toolkit={toolkit}>
        <PanelsToggle
          sidebarToggleState$={sidebarToggleState$}
          omitChartButton={omitChartButton}
          omitTableButton={omitTableButton}
        />
      </DiscoverToolkitTestProvider>
    );

    return { component, toolkit };
  };

  it('should render correctly when sidebar is visible and histogram is visible', async () => {
    const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
      isCollapsed: false,
      toggle: jest.fn(),
    });
    const { component } = await mountComponent({
      hideChart: false,
      hideTable: false,
      omitChartButton: false,
      omitTableButton: false,
      sidebarToggleState$,
    });

    expect(findTestSubject(component, 'dscHideSidebarButton').exists()).toBe(true);
    expect(findTestSubject(component, 'dscShowSidebarButton').exists()).toBe(false);

    expect(findTestSubject(component, 'dscHideHistogramButton').exists()).toBe(true);
    expect(findTestSubject(component, 'dscShowHistogramButton').exists()).toBe(false);

    expect(findTestSubject(component, 'dscHideTableButton').exists()).toBe(true);
    expect(findTestSubject(component, 'dscShowTableButton').exists()).toBe(false);
  });

  it('should render correctly when sidebar is collapsed and histogram is visible', async () => {
    const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
      isCollapsed: true,
      toggle: jest.fn(),
    });
    const { component } = await mountComponent({
      hideChart: false,
      hideTable: false,
      omitChartButton: false,
      omitTableButton: false,
      sidebarToggleState$,
    });

    expect(findTestSubject(component, 'dscShowSidebarButton').exists()).toBe(true);
    expect(findTestSubject(component, 'dscHideSidebarButton').exists()).toBe(false);

    expect(findTestSubject(component, 'dscHideHistogramButton').exists()).toBe(true);
    expect(findTestSubject(component, 'dscShowHistogramButton').exists()).toBe(false);

    expect(findTestSubject(component, 'dscHideTableButton').exists()).toBe(true);
    expect(findTestSubject(component, 'dscShowTableButton').exists()).toBe(false);

    findTestSubject(component, 'dscShowSidebarButton').simulate('click');

    expect(sidebarToggleState$.getValue().toggle).toHaveBeenCalledWith(false);
  });

  it('should render correctly when sidebar is visible and chart/table toggles are omitted', async () => {
    const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
      isCollapsed: false,
      toggle: jest.fn(),
    });
    const { component } = await mountComponent({
      hideChart: false,
      hideTable: false,
      omitChartButton: true,
      omitTableButton: true,
      sidebarToggleState$,
    });

    expect(findTestSubject(component, 'dscHideSidebarButton').exists()).toBe(true);
    expect(findTestSubject(component, 'dscShowSidebarButton').exists()).toBe(false);

    expect(findTestSubject(component, 'dscHideHistogramButton').exists()).toBe(false);
    expect(findTestSubject(component, 'dscShowHistogramButton').exists()).toBe(false);

    expect(findTestSubject(component, 'dscHideTableButton').exists()).toBe(false);
    expect(findTestSubject(component, 'dscShowTableButton').exists()).toBe(false);
  });

  it('should render correctly when both sidebar and histogram are collapsed', async () => {
    const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
      isCollapsed: true,
      toggle: jest.fn(),
    });
    const { component } = await mountComponent({
      hideChart: true,
      hideTable: false,
      omitChartButton: false,
      omitTableButton: false,
      sidebarToggleState$,
    });

    expect(findTestSubject(component, 'dscHideSidebarButton').exists()).toBe(false);
    expect(findTestSubject(component, 'dscShowSidebarButton').exists()).toBe(true);

    expect(findTestSubject(component, 'dscHideHistogramButton').exists()).toBe(false);
    expect(findTestSubject(component, 'dscShowHistogramButton').exists()).toBe(true);

    expect(findTestSubject(component, 'dscHideTableButton').exists()).toBe(true);
    expect(findTestSubject(component, 'dscShowTableButton').exists()).toBe(false);
  });

  it('should render correctly when sidebar is collapsed and chart/table toggles are omitted', async () => {
    const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
      isCollapsed: true,
      toggle: jest.fn(),
    });
    const { component } = await mountComponent({
      hideChart: false,
      hideTable: false,
      omitChartButton: true,
      omitTableButton: true,
      sidebarToggleState$,
    });

    expect(findTestSubject(component, 'dscHideSidebarButton').exists()).toBe(false);
    expect(findTestSubject(component, 'dscShowSidebarButton').exists()).toBe(true);

    expect(findTestSubject(component, 'dscHideHistogramButton').exists()).toBe(false);
    expect(findTestSubject(component, 'dscShowHistogramButton').exists()).toBe(false);

    expect(findTestSubject(component, 'dscHideTableButton').exists()).toBe(false);
    expect(findTestSubject(component, 'dscShowTableButton').exists()).toBe(false);
  });

  it('should disable chart collapse when table is collapsed', async () => {
    const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
      isCollapsed: false,
      toggle: jest.fn(),
    });
    const { component } = await mountComponent({
      hideChart: false,
      hideTable: true,
      omitChartButton: false,
      omitTableButton: false,
      sidebarToggleState$,
    });

    const chartButton = findTestSubject(component, 'dscHideHistogramButton');
    expect(chartButton.prop('disabled')).toBe(true);
  });

  it('should disable table collapse when chart is collapsed', async () => {
    const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
      isCollapsed: false,
      toggle: jest.fn(),
    });
    const { component } = await mountComponent({
      hideChart: true,
      hideTable: false,
      omitChartButton: false,
      omitTableButton: false,
      sidebarToggleState$,
    });

    const tableButton = findTestSubject(component, 'dscHideTableButton');
    expect(tableButton.prop('disabled')).toBe(true);
  });

  it('should persist chart visibility when toggled', async () => {
    const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
      isCollapsed: false,
      toggle: jest.fn(),
    });
    const { component, toolkit } = await mountComponent({
      hideChart: false,
      hideTable: false,
      omitChartButton: false,
      omitTableButton: false,
      sidebarToggleState$,
    });
    const storageSetSpy = jest.spyOn(toolkit.services.storage, 'set');

    await act(async () => {
      findTestSubject(component, 'dscHideHistogramButton').simulate('click');
    });
    component.update();

    await waitFor(() => {
      expect(storageSetSpy).toHaveBeenCalledWith('discover:chartHidden', true);
      expect(toolkit.getCurrentTab().appState.hideChart).toBe(true);
    });
  });

  it('should persist table visibility when toggled', async () => {
    const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
      isCollapsed: false,
      toggle: jest.fn(),
    });
    const { component, toolkit } = await mountComponent({
      hideChart: false,
      hideTable: false,
      omitChartButton: false,
      omitTableButton: false,
      sidebarToggleState$,
    });
    const storageSetSpy = jest.spyOn(toolkit.services.storage, 'set');

    await act(async () => {
      findTestSubject(component, 'dscHideTableButton').simulate('click');
    });
    component.update();

    await waitFor(() => {
      expect(storageSetSpy).toHaveBeenCalledWith('discover:tableHidden', true);
      expect(toolkit.getCurrentTab().appState.hideTable).toBe(true);
    });
  });
});
