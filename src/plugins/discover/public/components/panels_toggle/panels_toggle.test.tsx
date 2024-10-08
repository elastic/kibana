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
import { getDiscoverStateMock } from '../../__mocks__/discover_state.mock';
import { PanelsToggle, type PanelsToggleProps } from './panels_toggle';
import { DiscoverAppStateProvider } from '../../application/main/state_management/discover_app_state_container';
import { SidebarToggleState } from '../../application/types';

describe('Panels toggle component', () => {
  const mountComponent = ({
    sidebarToggleState$,
    isChartAvailable,
    renderedFor,
    hideChart,
  }: Omit<PanelsToggleProps, 'stateContainer'> & { hideChart: boolean }) => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    const appStateContainer = stateContainer.appState;
    appStateContainer.set({
      hideChart,
    });

    return mountWithIntl(
      <DiscoverAppStateProvider value={appStateContainer}>
        <PanelsToggle
          stateContainer={stateContainer}
          sidebarToggleState$={sidebarToggleState$}
          isChartAvailable={isChartAvailable}
          renderedFor={renderedFor}
        />
      </DiscoverAppStateProvider>
    );
  };

  describe('inside histogram toolbar', function () {
    it('should render correctly when sidebar is visible and histogram is visible', () => {
      const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
        isCollapsed: false,
        toggle: jest.fn(),
      });
      const component = mountComponent({
        hideChart: false,
        isChartAvailable: undefined,
        renderedFor: 'histogram',
        sidebarToggleState$,
      });
      expect(findTestSubject(component, 'dscShowSidebarButton').exists()).toBe(false);
      expect(findTestSubject(component, 'dscHideHistogramButton').exists()).toBe(true);
    });

    it('should render correctly when sidebar is collapsed and histogram is visible', () => {
      const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
        isCollapsed: true,
        toggle: jest.fn(),
      });
      const component = mountComponent({
        hideChart: false,
        isChartAvailable: undefined,
        renderedFor: 'histogram',
        sidebarToggleState$,
      });
      expect(findTestSubject(component, 'dscShowSidebarButton').exists()).toBe(true);
      expect(findTestSubject(component, 'dscHideHistogramButton').exists()).toBe(true);

      findTestSubject(component, 'dscShowSidebarButton').simulate('click');

      expect(sidebarToggleState$.getValue().toggle).toHaveBeenCalledWith(false);
    });
  });

  describe('inside view mode tabs', function () {
    it('should render correctly when sidebar is visible and histogram is visible', () => {
      const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
        isCollapsed: false,
        toggle: jest.fn(),
      });
      const component = mountComponent({
        hideChart: false,
        isChartAvailable: true,
        renderedFor: 'tabs',
        sidebarToggleState$,
      });
      expect(findTestSubject(component, 'dscShowSidebarButton').exists()).toBe(false);
      expect(findTestSubject(component, 'dscHideHistogramButton').exists()).toBe(false);
      expect(findTestSubject(component, 'dscShowHistogramButton').exists()).toBe(false);
    });

    it('should render correctly when sidebar is visible and histogram is visible but chart is not available', () => {
      const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
        isCollapsed: false,
        toggle: jest.fn(),
      });
      const component = mountComponent({
        hideChart: false,
        isChartAvailable: false,
        renderedFor: 'tabs',
        sidebarToggleState$,
      });
      expect(findTestSubject(component, 'dscShowSidebarButton').exists()).toBe(false);
      expect(findTestSubject(component, 'dscHideHistogramButton').exists()).toBe(false);
      expect(findTestSubject(component, 'dscShowHistogramButton').exists()).toBe(false);
    });

    it('should render correctly when sidebar is hidden and histogram is visible', () => {
      const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
        isCollapsed: true,
        toggle: jest.fn(),
      });
      const component = mountComponent({
        hideChart: false,
        isChartAvailable: true,
        renderedFor: 'tabs',
        sidebarToggleState$,
      });
      expect(findTestSubject(component, 'dscShowSidebarButton').exists()).toBe(false);
      expect(findTestSubject(component, 'dscHideHistogramButton').exists()).toBe(false);
      expect(findTestSubject(component, 'dscShowHistogramButton').exists()).toBe(false);
    });

    it('should render correctly when sidebar is hidden and histogram is visible but chart is not available', () => {
      const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
        isCollapsed: true,
        toggle: jest.fn(),
      });
      const component = mountComponent({
        hideChart: false,
        isChartAvailable: false,
        renderedFor: 'tabs',
        sidebarToggleState$,
      });
      expect(findTestSubject(component, 'dscShowSidebarButton').exists()).toBe(true);
      expect(findTestSubject(component, 'dscHideHistogramButton').exists()).toBe(false);
      expect(findTestSubject(component, 'dscShowHistogramButton').exists()).toBe(false);
    });

    it('should render correctly when sidebar is visible and histogram is hidden', () => {
      const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
        isCollapsed: false,
        toggle: jest.fn(),
      });
      const component = mountComponent({
        hideChart: true,
        isChartAvailable: true,
        renderedFor: 'tabs',
        sidebarToggleState$,
      });
      expect(findTestSubject(component, 'dscShowSidebarButton').exists()).toBe(false);
      expect(findTestSubject(component, 'dscShowHistogramButton').exists()).toBe(true);
    });

    it('should render correctly when sidebar is visible and histogram is hidden but chart is not available', () => {
      const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
        isCollapsed: false,
        toggle: jest.fn(),
      });
      const component = mountComponent({
        hideChart: true,
        isChartAvailable: false,
        renderedFor: 'tabs',
        sidebarToggleState$,
      });
      expect(findTestSubject(component, 'dscShowSidebarButton').exists()).toBe(false);
      expect(findTestSubject(component, 'dscShowHistogramButton').exists()).toBe(false);
      expect(findTestSubject(component, 'dscHideHistogramButton').exists()).toBe(false);
    });

    it('should render correctly when sidebar is hidden and histogram is hidden', () => {
      const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
        isCollapsed: true,
        toggle: jest.fn(),
      });
      const component = mountComponent({
        hideChart: true,
        isChartAvailable: true,
        renderedFor: 'tabs',
        sidebarToggleState$,
      });
      expect(findTestSubject(component, 'dscShowSidebarButton').exists()).toBe(true);
      expect(findTestSubject(component, 'dscShowHistogramButton').exists()).toBe(true);
    });

    it('should render correctly when sidebar is hidden and histogram is hidden but chart is not available', () => {
      const sidebarToggleState$ = new BehaviorSubject<SidebarToggleState>({
        isCollapsed: true,
        toggle: jest.fn(),
      });
      const component = mountComponent({
        hideChart: true,
        isChartAvailable: false,
        renderedFor: 'tabs',
        sidebarToggleState$,
      });
      expect(findTestSubject(component, 'dscShowSidebarButton').exists()).toBe(true);
      expect(findTestSubject(component, 'dscShowHistogramButton').exists()).toBe(false);
      expect(findTestSubject(component, 'dscHideHistogramButton').exists()).toBe(false);
    });
  });
});
