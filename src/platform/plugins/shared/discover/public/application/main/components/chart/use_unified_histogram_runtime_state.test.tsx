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
import type { InternalStateMockToolkit } from '../../../../__mocks__/discover_state.mock';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';
import React from 'react';
import { DEFAULT_HISTOGRAM_KEY_PREFIX, selectTabRuntimeState } from '../../state_management/redux';

jest.mock('./use_discover_histogram', () => ({
  useDiscoverHistogram: jest.fn(),
}));

const useDiscoverHistogramMock = useDiscoverHistogram as jest.MockedFunction<
  typeof useDiscoverHistogram
>;

describe('useUnifiedHistogramRuntimeState', () => {
  const setup = async () => {
    const toolkit = getDiscoverInternalStateMock();

    await toolkit.initializeTabs();

    const { stateContainer } = await toolkit.initializeSingleTab({
      tabId: toolkit.getCurrentTab().id,
    });

    return { toolkit, stateContainer };
  };

  const renderUseUnifiedHistogramRuntimeState = async ({
    toolkit,
    localStorageKeyPrefix,
  }: {
    toolkit?: InternalStateMockToolkit;
    localStorageKeyPrefix?: string;
  } = {}) => {
    if (!toolkit) {
      ({ toolkit } = await setup());
    }

    const stateContainer = selectTabRuntimeState(
      toolkit.runtimeStateManager,
      toolkit.getCurrentTab().id
    ).stateContainer$.getValue()!;

    const hook = renderHook(
      () => useUnifiedHistogramRuntimeState(stateContainer, localStorageKeyPrefix),
      {
        wrapper: ({ children }) => (
          <DiscoverToolkitTestProvider toolkit={toolkit}>{children}</DiscoverToolkitTestProvider>
        ),
      }
    );

    return { hook, stateContainer };
  };

  beforeEach(() => {
    useDiscoverHistogramMock.mockImplementation(jest.fn());
  });

  it('should return the current tab id', async () => {
    const { hook, stateContainer } = await renderUseUnifiedHistogramRuntimeState();

    expect(hook.result.current.currentTabId).toBe(stateContainer.getCurrentTab().id);
  });

  it('should call useDiscoverHistogramMock with correct arguments', async () => {
    const { stateContainer } = await renderUseUnifiedHistogramRuntimeState();

    expect(useDiscoverHistogramMock).toBeCalledWith(
      stateContainer,
      expect.objectContaining({
        initialLayoutProps: undefined,
      })
    );
  });

  it('should call useDiscoverHistogramMock with initialLayoutProps for default local storage key prefix', async () => {
    const { toolkit, stateContainer } = await setup();

    const histogramConfig$ = selectTabRuntimeState(
      toolkit.runtimeStateManager,
      toolkit.getCurrentTab().id
    ).unifiedHistogramConfig$;

    histogramConfig$.next({
      ...histogramConfig$.getValue(),
      layoutPropsMap: {
        ...histogramConfig$.getValue().layoutPropsMap,
        [DEFAULT_HISTOGRAM_KEY_PREFIX]: { topPanelHeight: 123 },
      },
    });

    await renderUseUnifiedHistogramRuntimeState({ toolkit });

    expect(useDiscoverHistogramMock).toBeCalledWith(
      stateContainer,
      expect.objectContaining({
        initialLayoutProps: { topPanelHeight: 123 },
      })
    );
  });

  it('should call useDiscoverHistogramMock with initialLayoutProps for custom local storage key prefix', async () => {
    const localStorageKeyPrefix = 'customKeyPrefix';
    const { toolkit, stateContainer } = await setup();

    const histogramConfig$ = selectTabRuntimeState(
      toolkit.runtimeStateManager,
      toolkit.getCurrentTab().id
    ).unifiedHistogramConfig$;

    histogramConfig$.next({
      ...histogramConfig$.getValue(),
      layoutPropsMap: {
        ...histogramConfig$.getValue().layoutPropsMap,
        [localStorageKeyPrefix]: { topPanelHeight: 456 },
      },
    });

    await renderUseUnifiedHistogramRuntimeState({
      toolkit,
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
