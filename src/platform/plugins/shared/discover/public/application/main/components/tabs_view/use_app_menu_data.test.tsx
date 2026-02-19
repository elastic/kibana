/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { METRIC_TYPE } from '@kbn/analytics';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type { TabMenuItemWithClick } from '@kbn/unified-tabs';
import { isEsqlSource } from '../../../../../common/data_sources';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';
import { internalStateActions } from '../../state_management/redux';
import { useAppMenuData } from './use_app_menu_data';
import type { DataView } from '@kbn/data-views-plugin/common';

describe('useAppMenuData', () => {
  const setup = async ({
    enableEsql = true,
    dataView = dataViewMock,
  }: { enableEsql?: boolean; dataView?: DataView | null } = {}) => {
    const toolkit = getDiscoverInternalStateMock();

    await toolkit.initializeTabs();
    await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });

    // Ensure ENABLE_ESQL is controllable in these tests
    const uiSettingsGetSpy = jest.spyOn(toolkit.services.uiSettings, 'get');
    const originalGetImpl = uiSettingsGetSpy.getMockImplementation();
    uiSettingsGetSpy.mockImplementation((key: string) => {
      if (key === ENABLE_ESQL) return enableEsql;
      return originalGetImpl?.(key);
    });

    const hook = renderHook(() => useAppMenuData({ currentDataView: dataView ?? undefined }), {
      wrapper: ({ children }) => (
        <DiscoverToolkitTestProvider toolkit={toolkit}>{children}</DiscoverToolkitTestProvider>
      ),
    });

    return { toolkit, hook };
  };

  it('adds "Switch to ES|QL" for the current tab in classic mode', async () => {
    const { toolkit, hook } = await setup();
    const items = hook.result.current.getAdditionalTabMenuItems?.(toolkit.getCurrentTab());

    expect(items).toContainEqual(
      expect.objectContaining({
        'data-test-subj': 'unifiedTabs_tabMenuItem_switchToESQL',
        name: 'switchToESQL',
        label: 'Switch to ES|QL',
      })
    );

    const switchToESQL = items?.find((menuItem): menuItem is TabMenuItemWithClick => {
      return menuItem !== 'divider' && menuItem.name === 'switchToESQL';
    });

    expect(switchToESQL?.onClick).toBeInstanceOf(Function);

    act(() => {
      switchToESQL?.onClick?.();
    });

    expect(toolkit.services.trackUiMetric).toHaveBeenCalledWith(
      METRIC_TYPE.CLICK,
      'esql:try_btn_clicked'
    );

    await waitFor(() => {
      expect(isEsqlSource(toolkit.getCurrentTab().appState.dataSource)).toBe(true);
    });
  });

  it('does not add "Switch to ES|QL" when ES|QL is disabled', async () => {
    const { toolkit, hook } = await setup({ enableEsql: false });
    const items = hook.result.current.getAdditionalTabMenuItems?.(toolkit.getCurrentTab());

    expect(items).toEqual([]);
  });

  it('keeps "Switch to classic" for the current tab when in ES|QL mode', async () => {
    const { toolkit, hook } = await setup();

    await act(async () => {
      toolkit.internalState.dispatch(
        internalStateActions.transitionFromDataViewToESQL({
          tabId: toolkit.getCurrentTab().id,
          dataView: dataViewMock,
        })
      );

      await toolkit.waitForDataFetching({ tabId: toolkit.getCurrentTab().id });
    });

    const items = hook.result.current.getAdditionalTabMenuItems?.(toolkit.getCurrentTab());

    expect(items).toContainEqual(
      expect.objectContaining({
        'data-test-subj': 'unifiedTabs_tabMenuItem_switchToClassic',
        name: 'switchToClassic',
        label: 'Switch to classic',
      })
    );

    expect(items).not.toContainEqual(
      expect.objectContaining({
        'data-test-subj': 'unifiedTabs_tabMenuItem_switchToESQL',
      })
    );
  });

  it('hides "Switch to ES|QL" until a data view is available', async () => {
    const { toolkit, hook } = await setup({ dataView: null });
    const items = hook.result.current.getAdditionalTabMenuItems?.(toolkit.getCurrentTab());

    expect(items).toEqual([]);
  });
});
