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
import { BehaviorSubject } from 'rxjs';
import { getDiscoverInternalStateMock } from '../../__mocks__/discover_state.mock';
import { PanelsToggle, type PanelsToggleProps } from './panels_toggle';
import type { SidebarToggleState } from '../../application/types';
import { DiscoverToolkitTestProvider } from '../../__mocks__/test_provider';
import { internalStateActions } from '../../application/main/state_management/redux';

describe('Panels toggle component', () => {
  const mountComponent = async ({
    sidebarToggleState$,
    omitChartButton, // this tells us if we have a chart available or not (for example time based vs non-time based data)
    hideChart, // this tells us if the chart is currently collapsed or not
  }: PanelsToggleProps & { hideChart: boolean }) => {
    const toolkit = getDiscoverInternalStateMock();

    await toolkit.initializeTabs();
    await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });

    toolkit.internalState.dispatch(
      internalStateActions.setAppState({
        tabId: toolkit.getCurrentTab().id,
        appState: { hideChart },
      })
    );

    return mountWithIntl(
      <DiscoverToolkitTestProvider toolkit={toolkit}>
        <PanelsToggle sidebarToggleState$={sidebarToggleState$} omitChartButton={omitChartButton} />
      </DiscoverToolkitTestProvider>
    );
  };

  it('should render correctly when sidebar is visible and histogram is visible', async () => {
    const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
      isCollapsed: false,
      toggle: jest.fn(),
    });
    const component = await mountComponent({
      hideChart: false,
      omitChartButton: false,
      sidebarToggleState$,
    });

    expect(findTestSubject(component, 'dscHideSidebarButton').exists()).toBe(true);
    expect(findTestSubject(component, 'dscShowSidebarButton').exists()).toBe(false);

    expect(findTestSubject(component, 'dscHideHistogramButton').exists()).toBe(true);
    expect(findTestSubject(component, 'dscShowHistogramButton').exists()).toBe(false);
  });

  it('should render correctly when sidebar is collapsed and histogram is visible', async () => {
    const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
      isCollapsed: true,
      toggle: jest.fn(),
    });
    const component = await mountComponent({
      hideChart: false,
      omitChartButton: false,
      sidebarToggleState$,
    });

    expect(findTestSubject(component, 'dscShowSidebarButton').exists()).toBe(true);
    expect(findTestSubject(component, 'dscHideSidebarButton').exists()).toBe(false);

    expect(findTestSubject(component, 'dscHideHistogramButton').exists()).toBe(true);
    expect(findTestSubject(component, 'dscShowHistogramButton').exists()).toBe(false);

    findTestSubject(component, 'dscShowSidebarButton').simulate('click');

    expect(sidebarToggleState$.getValue().toggle).toHaveBeenCalledWith(false);
  });

  it('should render correctly when sidebar is visible and histogram is not available for a given dataset', async () => {
    const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
      isCollapsed: false,
      toggle: jest.fn(),
    });
    const component = await mountComponent({
      hideChart: false,
      omitChartButton: true,
      sidebarToggleState$,
    });

    expect(findTestSubject(component, 'dscHideSidebarButton').exists()).toBe(true);
    expect(findTestSubject(component, 'dscShowSidebarButton').exists()).toBe(false);

    expect(findTestSubject(component, 'dscHideHistogramButton').exists()).toBe(false);
    expect(findTestSubject(component, 'dscShowHistogramButton').exists()).toBe(false);
  });

  it('should render correctly when both sidebar and histogram are collapsed', async () => {
    const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
      isCollapsed: true,
      toggle: jest.fn(),
    });
    const component = await mountComponent({
      hideChart: true,
      omitChartButton: false,
      sidebarToggleState$,
    });

    expect(findTestSubject(component, 'dscHideSidebarButton').exists()).toBe(false);
    expect(findTestSubject(component, 'dscShowSidebarButton').exists()).toBe(true);

    expect(findTestSubject(component, 'dscHideHistogramButton').exists()).toBe(false);
    expect(findTestSubject(component, 'dscShowHistogramButton').exists()).toBe(true);
  });

  it('should render correctly when sidebar is collapsed and histogram is not available for a given dataset', async () => {
    const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
      isCollapsed: true,
      toggle: jest.fn(),
    });
    const component = await mountComponent({
      hideChart: false,
      omitChartButton: true,
      sidebarToggleState$,
    });

    expect(findTestSubject(component, 'dscHideSidebarButton').exists()).toBe(false);
    expect(findTestSubject(component, 'dscShowSidebarButton').exists()).toBe(true);

    expect(findTestSubject(component, 'dscHideHistogramButton').exists()).toBe(false);
    expect(findTestSubject(component, 'dscShowHistogramButton').exists()).toBe(false);
  });
});
