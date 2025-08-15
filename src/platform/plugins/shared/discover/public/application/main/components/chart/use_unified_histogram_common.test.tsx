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
import { useUnifiedHistogramCommon } from './use_unified_histogram_common';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { selectTabRuntimeState } from '../../state_management/redux';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import type { UseUnifiedHistogramOptions } from './use_discover_histogram';
import { DiscoverTestProvider } from '../../../../__mocks__/test_provider';
import { dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import { setTimeout } from 'timers/promises';
import type { DiscoverMainContentProps } from '../layout/discover_main_content';

jest.mock('../../hooks/use_is_esql_mode', () => ({
  useIsEsqlMode: jest.fn(() => false),
}));

describe('useUnifiedHistogramCommon', () => {
  const getStateContainer = () => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    stateContainer.appState.update({
      interval: 'auto',
      hideChart: false,
    });
    const appState = stateContainer.appState;
    const wrappedStateContainer = Object.create(appState);
    wrappedStateContainer.update = jest.fn((newState) => appState.update(newState));
    stateContainer.appState = wrappedStateContainer;
    return stateContainer;
  };

  const renderUseUnifiedHistogramCommon = async (
    {
      stateContainer,
      panelsToggle,
      options,
    }: {
      stateContainer: DiscoverStateContainer;
      panelsToggle?: DiscoverMainContentProps['panelsToggle'];
      options?: UseUnifiedHistogramOptions;
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
      () =>
        useUnifiedHistogramCommon({
          currentTabId: stateContainer.getCurrentTab().id,
          stateContainer,
          layoutProps: options?.initialLayoutProps,
          panelsToggle,
        }),
      {
        wrapper: Wrapper,
      }
    );

    await act(() => setTimeout(0));

    return { hook };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update unifiedHistogramLayoutProps$ with new layoutProps', async () => {
    const layoutProps = {
      topPanelHeight: 50,
    };

    const stateContainer = getStateContainer();
    await renderUseUnifiedHistogramCommon({
      stateContainer,
    });

    expect(
      selectTabRuntimeState(
        stateContainer.runtimeStateManager,
        stateContainer.getCurrentTab().id
      ).unifiedHistogramLayoutProps$.getValue()
    ).toEqual(undefined);

    await renderUseUnifiedHistogramCommon({
      stateContainer,
      options: {
        initialLayoutProps: layoutProps,
      },
    });

    expect(
      selectTabRuntimeState(
        stateContainer.runtimeStateManager,
        stateContainer.getCurrentTab().id
      ).unifiedHistogramLayoutProps$.getValue()
    ).toEqual(layoutProps);
  });

  it('should clone panelsToggle if it is a valid React element', async () => {
    const stateContainer = getStateContainer();
    const { hook } = await renderUseUnifiedHistogramCommon({
      stateContainer,
      panelsToggle: <div>Test Panels Toggle</div>,
    });

    const clonedElement = hook.result.current.renderCustomChartToggleActions();
    expect(clonedElement?.props.renderedFor).toBe('histogram');
  });

  it('should return the isEsqlMode value from the useIsEsqlMode hook', async () => {
    const { hook } = await renderUseUnifiedHistogramCommon();

    expect(hook.result.current.isEsqlMode).toBe(false);
  });
});
