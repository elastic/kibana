/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { METRIC_TYPE } from '@kbn/analytics';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { DataSourceType } from '../../../../common/data_sources';
import { ESQL_TRANSITION_MODAL_KEY } from '../../../../common/constants';
import type { DiscoverServices } from '../../../build_services';
import { getDiscoverInternalStateMock } from '../../../__mocks__/discover_state.mock';
import { dataViewWithTimefieldMock } from '../../../__mocks__/data_view_with_timefield';
import { createDiscoverServicesMock } from '../../../__mocks__/services';
import { DiscoverToolkitTestProvider } from '../../../__mocks__/test_provider';
import { getPersistedTabMock } from '../state_management/redux/__mocks__/internal_state.mocks';
import { internalStateActions } from '../state_management/redux';
import { useCurrentTabMenuActions } from './use_current_tab_menu_actions';

describe('useCurrentTabMenuActions', () => {
  const getPersistedDiscoverSession = (services: DiscoverServices) => {
    const persistedTab = getPersistedTabMock({
      tabId: 'persisted-tab',
      dataView: dataViewWithTimefieldMock,
      services,
    });

    return createDiscoverSessionMock({
      id: 'persisted-session',
      tabs: [persistedTab],
    });
  };

  const setup = async () => {
    const services = createDiscoverServicesMock();
    const getUiSettingsMock = jest.mocked(services.uiSettings.get);
    const originalGetImplementation = getUiSettingsMock.getMockImplementation();

    getUiSettingsMock.mockImplementation((key, defaultOverride) => {
      if (key === ENABLE_ESQL) {
        return true;
      }

      return originalGetImplementation?.(key, defaultOverride);
    });

    const toolkit = getDiscoverInternalStateMock({
      services,
      persistedDataViews: [dataViewWithTimefieldMock],
    });

    await toolkit.initializeTabs({
      persistedDiscoverSession: getPersistedDiscoverSession(services),
    });

    return {
      services,
      toolkit,
      tabId: toolkit.getCurrentTab().id,
    };
  };

  const renderCurrentTabMenuActions = async (
    params: {
      currentDataView?: DataView;
    } = {}
  ) => {
    const context = await setup();
    const currentDataView =
      'currentDataView' in params ? params.currentDataView : dataViewWithTimefieldMock;

    const hook = renderHook(() => useCurrentTabMenuActions({ currentDataView }), {
      wrapper: ({ children }) => (
        <DiscoverToolkitTestProvider toolkit={context.toolkit}>
          {children}
        </DiscoverToolkitTestProvider>
      ),
    });

    return {
      ...context,
      ...hook,
    };
  };

  it('returns disabled language switching when there is no current data view', async () => {
    const { result, services, toolkit } = await renderCurrentTabMenuActions({
      currentDataView: undefined,
    });
    const initialDataSource = toolkit.getCurrentTab().appState.dataSource;

    expect(result.current.canSwitchLanguageMode).toBe(false);
    expect(result.current.isDataViewMode).toBe(true);
    expect(typeof result.current.openInspector).toBe('function');

    await act(async () => {
      result.current.switchLanguageMode();
    });

    expect(services.trackUiMetric).not.toHaveBeenCalled();
    expect(toolkit.getCurrentTab().appState.dataSource).toEqual(initialDataSource);
  });

  it('transitions the current tab from classic mode to ES|QL', async () => {
    const { result, services, toolkit } = await renderCurrentTabMenuActions();

    expect(result.current.canSwitchLanguageMode).toBe(true);
    expect(result.current.isDataViewMode).toBe(true);

    await act(async () => {
      result.current.switchLanguageMode();
    });

    expect(services.trackUiMetric).toHaveBeenCalledWith(METRIC_TYPE.CLICK, 'esql:try_btn_clicked');
    expect(result.current.isDataViewMode).toBe(false);
    expect(toolkit.getCurrentTab().appState.dataSource).toEqual({
      type: DataSourceType.Esql,
    });
  });

  it('shows the transition modal when switching from ES|QL back to classic with unsaved changes', async () => {
    const { services, toolkit, tabId } = await setup();

    toolkit.internalState.dispatch(
      internalStateActions.transitionFromDataViewToESQL({
        tabId,
        dataView: dataViewWithTimefieldMock,
      })
    );
    toolkit.internalState.dispatch(
      internalStateActions.setUnsavedChanges({
        hasUnsavedChanges: true,
        unsavedTabIds: [tabId],
      })
    );

    const { result } = renderHook(
      () => useCurrentTabMenuActions({ currentDataView: dataViewWithTimefieldMock }),
      {
        wrapper: ({ children }) => (
          <DiscoverToolkitTestProvider toolkit={toolkit}>{children}</DiscoverToolkitTestProvider>
        ),
      }
    );

    expect(result.current.isDataViewMode).toBe(false);

    await act(async () => {
      result.current.switchLanguageMode();
    });

    expect(services.trackUiMetric).toHaveBeenCalledWith(
      METRIC_TYPE.CLICK,
      'esql:back_to_classic_clicked'
    );
    expect(toolkit.internalState.getState().isESQLToDataViewTransitionModalVisible).toBe(true);
    expect(toolkit.getCurrentTab().appState.dataSource).toEqual({
      type: DataSourceType.Esql,
    });
  });

  it('transitions from ES|QL back to classic when the transition modal was already dismissed', async () => {
    const { services, toolkit, tabId } = await setup();

    toolkit.internalState.dispatch(
      internalStateActions.transitionFromDataViewToESQL({
        tabId,
        dataView: dataViewWithTimefieldMock,
      })
    );
    toolkit.internalState.dispatch(
      internalStateActions.setUnsavedChanges({
        hasUnsavedChanges: true,
        unsavedTabIds: [tabId],
      })
    );
    services.storage.set(ESQL_TRANSITION_MODAL_KEY, 'true');

    const { result } = renderHook(
      () => useCurrentTabMenuActions({ currentDataView: dataViewWithTimefieldMock }),
      {
        wrapper: ({ children }) => (
          <DiscoverToolkitTestProvider toolkit={toolkit}>{children}</DiscoverToolkitTestProvider>
        ),
      }
    );

    expect(result.current.isDataViewMode).toBe(false);

    await act(async () => {
      result.current.switchLanguageMode();
    });

    expect(services.trackUiMetric).toHaveBeenCalledWith(
      METRIC_TYPE.CLICK,
      'esql:back_to_classic_clicked'
    );
    expect(toolkit.internalState.getState().isESQLToDataViewTransitionModalVisible).toBe(false);
    expect(result.current.isDataViewMode).toBe(true);
    expect(toolkit.getCurrentTab().appState.dataSource).toEqual({
      type: DataSourceType.DataView,
      dataViewId: dataViewWithTimefieldMock.id,
    });
  });
});
