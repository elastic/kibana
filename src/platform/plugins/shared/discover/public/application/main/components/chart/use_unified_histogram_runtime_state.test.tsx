/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useUnifiedHistogramRuntimeState } from './use_unified_histogram_runtime_state';
import { useDiscoverHistogram } from './use_discover_histogram';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverTestProvider } from '../../../../__mocks__/test_provider';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import React from 'react';
import { dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import { DEFAULT_HISTOGRAM_KEY_PREFIX, selectTabRuntimeState } from '../../state_management/redux';

jest.mock('./use_discover_histogram', () => ({
  useDiscoverHistogram: jest.fn(),
}));

const useDiscoverHistogramMock = useDiscoverHistogram as jest.MockedFunction<
  typeof useDiscoverHistogram
>;

describe('useUnifiedHistogramRuntimeState', () => {
  const getStateContainer = () => getDiscoverStateMock({ isTimeBased: true });

  const renderUseUnifiedHistogramRuntimeState = (
    {
      stateContainer,
      localStorageKeyPrefix,
    }: {
      stateContainer: DiscoverStateContainer;
      localStorageKeyPrefix?: string;
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

    const hook = renderHook(
      () => useUnifiedHistogramRuntimeState(stateContainer, localStorageKeyPrefix),
      {
        wrapper: Wrapper,
      }
    );

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

  it('should call useDiscoverHistogramMock with initialLayoutProps for default local storage key prefix', () => {
    const stateContainer = getStateContainer();

    const histogramConfig$ = selectTabRuntimeState(
      stateContainer.runtimeStateManager,
      stateContainer.getCurrentTab().id
    ).unifiedHistogramConfig$;

    histogramConfig$.next({
      ...histogramConfig$.getValue(),
      layoutPropsMap: {
        ...histogramConfig$.getValue().layoutPropsMap,
        [DEFAULT_HISTOGRAM_KEY_PREFIX]: { topPanelHeight: 123 },
      },
    });

    renderUseUnifiedHistogramRuntimeState({ stateContainer });

    expect(useDiscoverHistogramMock).toBeCalledWith(
      stateContainer,
      expect.objectContaining({
        initialLayoutProps: { topPanelHeight: 123 },
      })
    );
  });

  it('should call useDiscoverHistogramMock with initialLayoutProps for custom local storage key prefix', () => {
    const localStorageKeyPrefix = 'customKeyPrefix';
    const stateContainer = getStateContainer();

    const histogramConfig$ = selectTabRuntimeState(
      stateContainer.runtimeStateManager,
      stateContainer.getCurrentTab().id
    ).unifiedHistogramConfig$;

    histogramConfig$.next({
      ...histogramConfig$.getValue(),
      layoutPropsMap: {
        ...histogramConfig$.getValue().layoutPropsMap,
        [localStorageKeyPrefix]: { topPanelHeight: 456 },
      },
    });

    renderUseUnifiedHistogramRuntimeState({
      stateContainer,
      localStorageKeyPrefix,
    });

    expect(useDiscoverHistogramMock).toBeCalledWith(
      stateContainer,
      expect.objectContaining({
        initialLayoutProps: { topPanelHeight: 456 },
      })
    );
  });
});
