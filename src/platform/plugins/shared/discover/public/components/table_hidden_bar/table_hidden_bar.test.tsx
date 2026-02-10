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
import type { DataTotalHits$ } from '../../application/main/state_management/discover_data_state_container';
import { FetchStatus } from '../../application/types';
import { TableHiddenBar } from './table_hidden_bar';
import { PanelsToggle } from '../panels_toggle';
import { DiscoverTestProvider } from '../../__mocks__/test_provider';
import { internalStateActions } from '../../application/main/state_management/redux';

describe('TableHiddenBar', () => {
  const sidebarToggleState$ = new BehaviorSubject({
    isCollapsed: false,
    toggle: () => {},
  });

  const mountComponent = (props?: { panelsToggle?: React.ReactElement }) => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    stateContainer.dataState.data$.totalHits$ = new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      result: 1000,
    }) as DataTotalHits$;

    stateContainer.internalState.dispatch(
      stateContainer.injectCurrentTab(internalStateActions.setAppState)({
        appState: { hideDataTable: true },
      })
    );

    const panelsToggle =
      props?.panelsToggle ?? (
        <PanelsToggle
          sidebarToggleState$={sidebarToggleState$}
          renderedFor="tabs"
          isChartAvailable={true}
        />
      );

    return mountWithIntl(
      <DiscoverTestProvider stateContainer={stateContainer}>
        <TableHiddenBar
          stateContainer={stateContainer}
          panelsToggle={panelsToggle}
        />
      </DiscoverTestProvider>
    );
  };

  it('renders hits counter and show table button', () => {
    const component = mountComponent();
    expect(findTestSubject(component, 'dscTableHiddenBar').exists()).toBe(true);
    expect(findTestSubject(component, 'discoverQueryTotalHits').exists()).toBe(true);
    expect(findTestSubject(component, 'dscShowTableButton').exists()).toBe(true);
  });

  it('shows table when show table button is clicked', () => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    stateContainer.dataState.data$.totalHits$ = new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      result: 1000,
    }) as DataTotalHits$;

    stateContainer.internalState.dispatch(
      stateContainer.injectCurrentTab(internalStateActions.setAppState)({
        appState: { hideDataTable: true },
      })
    );

    const component = mountWithIntl(
      <DiscoverTestProvider stateContainer={stateContainer}>
        <TableHiddenBar
          stateContainer={stateContainer}
          panelsToggle={
            <PanelsToggle
              sidebarToggleState$={sidebarToggleState$}
              renderedFor="tabs"
              isChartAvailable={true}
            />
          }
        />
      </DiscoverTestProvider>
    );

    findTestSubject(component, 'dscShowTableButton').simulate('click');

    expect(stateContainer.getCurrentTab().appState.hideDataTable).toBe(false);
  });
});
