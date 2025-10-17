/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { useUnifiedHistogramCommon } from './use_unified_histogram_common';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { DEFAULT_HISTOGRAM_KEY_PREFIX, selectTabRuntimeState } from '../../state_management/redux';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import type { UseUnifiedHistogramOptions } from './use_discover_histogram';
import { DiscoverTestProvider } from '../../../../__mocks__/test_provider';
import { dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import type { DiscoverMainContentProps } from '../layout/discover_main_content';

describe('useUnifiedHistogramCommon', () => {
  const getStateContainer = () => getDiscoverStateMock({ isTimeBased: true });

  const renderUseUnifiedHistogramCommon = (
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
    const Wrapper = ({
      children,
      stateContainerProp,
    }: React.PropsWithChildren<{ stateContainerProp: DiscoverStateContainer }>) => (
      <DiscoverTestProvider
        stateContainer={stateContainerProp}
        runtimeState={{ currentDataView: dataViewMockWithTimeField, adHocDataViews: [] }}
      >
        {children}
      </DiscoverTestProvider>
    );

    const hook = renderHook(
      ({ stateContainerProp, layoutProps }) =>
        useUnifiedHistogramCommon({
          currentTabId: stateContainerProp.getCurrentTab().id,
          stateContainer: stateContainerProp,
          layoutProps,
          panelsToggle,
        }),
      {
        wrapper: ({ children }) => (
          <Wrapper stateContainerProp={stateContainer}>{children}</Wrapper>
        ),
        initialProps: {
          stateContainerProp: stateContainer,
          layoutProps: options?.initialLayoutProps,
        },
      }
    );

    return { hook };
  };

  it('should update unifiedHistogramConfig$ with new layoutProps', () => {
    const layoutProps = {
      topPanelHeight: 50,
    };

    const stateContainer = getStateContainer();
    const { hook } = renderUseUnifiedHistogramCommon({
      stateContainer,
    });
    const histogramConfig = selectTabRuntimeState(
      stateContainer.runtimeStateManager,
      stateContainer.getCurrentTab().id
    ).unifiedHistogramConfig$;

    expect(histogramConfig.getValue().layoutPropsMap[DEFAULT_HISTOGRAM_KEY_PREFIX]).toEqual(
      undefined
    );

    hook.rerender({
      stateContainerProp: stateContainer,
      layoutProps,
    });

    expect(histogramConfig.getValue().layoutPropsMap[DEFAULT_HISTOGRAM_KEY_PREFIX]).toEqual(
      layoutProps
    );
  });

  it('should clone panelsToggle if it is a valid React element', () => {
    const stateContainer = getStateContainer();
    const { hook } = renderUseUnifiedHistogramCommon({
      stateContainer,
      panelsToggle: <div>Test Panels Toggle</div>,
    });

    const clonedElement = hook.result.current.renderCustomChartToggleActions();
    expect(clonedElement?.props.renderedFor).toBe('histogram');
  });

  it('should return the isEsqlMode value from the useIsEsqlMode hook', () => {
    const { hook } = renderUseUnifiedHistogramCommon();

    expect(hook.result.current.isEsqlMode).toBe(false);
  });
});
