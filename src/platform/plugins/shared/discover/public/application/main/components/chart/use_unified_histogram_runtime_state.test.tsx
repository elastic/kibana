/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useUnifiedHistogramRuntimeState } from './use_unified_histogram_runtime_state';
import { useDiscoverHistogram } from './use_discover_histogram';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverTestProvider } from '../../../../__mocks__/test_provider';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import React from 'react';
import { dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import { selectTabRuntimeState } from '../../state_management/redux';

jest.mock('./use_discover_histogram', () => ({
  useDiscoverHistogram: jest.fn(),
}));

const useDiscoverHistogramMock = useDiscoverHistogram as jest.MockedFunction<
  typeof useDiscoverHistogram
>;

describe('useUnifiedHistogramWithRuntimeState', () => {
  const getStateContainer = () => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    stateContainer.appState.update({
      interval: 'auto',
      hideChart: false,
    });

    return stateContainer;
  };

  const renderUseUnifiedHistogramRuntimeState = (
    {
      stateContainer,
    }: {
      stateContainer: DiscoverStateContainer;
    } = {
      stateContainer: getStateContainer(),
    }
  ) => {
    const Wrapper = ({ children }: React.PropsWithChildren<unknown>) => (
      <DiscoverTestProvider
        stateContainer={stateContainer}
        runtimeState={{ currentDataView: dataViewMockWithTimeField, adHocDataViews: [] }}
      >
        {children}
      </DiscoverTestProvider>
    );

    const hook = renderHook(() => useUnifiedHistogramRuntimeState(stateContainer), {
      wrapper: Wrapper,
    });

    return { hook, stateContainer };
  };

  beforeEach(() => {
    useDiscoverHistogramMock.mockImplementation(jest.fn());
  });

  it('should return the current tab id', () => {
    const { hook, stateContainer } = renderUseUnifiedHistogramRuntimeState();

    expect(hook.result.current.currentTabId).toBe(stateContainer.getCurrentTab().id);
  });

  it('should call useDiscoverHistogramMock with correct arguments', () => {
    const { stateContainer } = renderUseUnifiedHistogramRuntimeState();

    expect(useDiscoverHistogramMock).toBeCalledWith(
      stateContainer,
      expect.objectContaining({
        initialLayoutProps: undefined,
      })
    );
  });

  it('should reset topPanelHeight in layout props$', () => {
    const { stateContainer } = renderUseUnifiedHistogramRuntimeState();

    const layoutProps$ = selectTabRuntimeState(
      stateContainer.runtimeStateManager,
      stateContainer.getCurrentTab().id
    ).unifiedHistogramLayoutProps$;

    renderUseUnifiedHistogramRuntimeState({ stateContainer });

    const updatedLayoutPropsValue = layoutProps$.getValue();
    expect(updatedLayoutPropsValue?.topPanelHeight).toBeUndefined();
  });

  it('should update options with new layoutProps', async () => {
    const { stateContainer } = renderUseUnifiedHistogramRuntimeState();

    const layoutProps$ = selectTabRuntimeState(
      stateContainer.runtimeStateManager,
      stateContainer.getCurrentTab().id
    ).unifiedHistogramLayoutProps$;

    act(() => {
      layoutProps$.next({
        topPanelHeight: 123,
      });
    });

    const updatedLayoutPropsValue = layoutProps$.getValue();
    expect(updatedLayoutPropsValue?.topPanelHeight).toEqual(123);

    await waitFor(() => {
      expect(useDiscoverHistogramMock).toHaveBeenLastCalledWith(
        stateContainer,
        expect.objectContaining({ initialLayoutProps: { topPanelHeight: 123 } })
      );
    });
  });
});
