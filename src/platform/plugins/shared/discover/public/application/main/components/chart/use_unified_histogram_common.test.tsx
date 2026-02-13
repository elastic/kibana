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
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { DEFAULT_HISTOGRAM_KEY_PREFIX, selectTabRuntimeState } from '../../state_management/redux';
import type { UseUnifiedHistogramOptions } from './use_discover_histogram';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';
import type { DiscoverMainContentProps } from '../layout/discover_main_content';

describe('useUnifiedHistogramCommon', () => {
  const setup = async () => {
    const toolkit = getDiscoverInternalStateMock();

    await toolkit.initializeTabs();

    const { stateContainer } = await toolkit.initializeSingleTab({
      tabId: toolkit.getCurrentTab().id,
    });

    return { toolkit, stateContainer };
  };

  const renderUseUnifiedHistogramCommon = async ({
    panelsToggle,
    options,
  }: {
    panelsToggle?: DiscoverMainContentProps['panelsToggle'];
    options?: UseUnifiedHistogramOptions;
  } = {}) => {
    const { toolkit, stateContainer } = await setup();

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
          <DiscoverToolkitTestProvider toolkit={toolkit}>{children}</DiscoverToolkitTestProvider>
        ),
        initialProps: {
          stateContainerProp: stateContainer,
          layoutProps: options?.initialLayoutProps,
        },
      }
    );

    return { hook, toolkit, stateContainer };
  };

  it('should update unifiedHistogramConfig$ with new layoutProps', async () => {
    const layoutProps = {
      topPanelHeight: 50,
    };

    const { hook, toolkit, stateContainer } = await renderUseUnifiedHistogramCommon();
    const histogramConfig = selectTabRuntimeState(
      toolkit.runtimeStateManager,
      toolkit.getCurrentTab().id
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

  it('should clone panelsToggle if it is a valid React element', async () => {
    const { hook } = await renderUseUnifiedHistogramCommon({
      panelsToggle: <div>Test Panels Toggle</div>,
    });

    const clonedElement = hook.result.current.renderCustomChartToggleActions();
    expect(clonedElement?.props.renderedFor).toBe('histogram');
  });
});
