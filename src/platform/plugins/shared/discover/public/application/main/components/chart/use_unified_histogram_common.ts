/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UnifiedHistogramPartialLayoutProps } from '@kbn/unified-histogram';
import React, { useCallback, useEffect } from 'react';
import type { DiscoverMainContentProps } from '../layout/discover_main_content';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import { DEFAULT_HISTOGRAM_KEY_PREFIX, selectTabRuntimeState } from '../../state_management/redux';

export const useUnifiedHistogramCommon = ({
  currentTabId,
  layoutProps,
  stateContainer,
  panelsToggle,
  localStorageKeyPrefix,
}: {
  currentTabId: string;
  layoutProps?: UnifiedHistogramPartialLayoutProps;
  stateContainer: DiscoverStateContainer;
  panelsToggle?: DiscoverMainContentProps['panelsToggle'];
  localStorageKeyPrefix?: string;
}) => {
  useEffect(() => {
    if (!layoutProps) {
      return;
    }

    const histogramConfig$ = selectTabRuntimeState(
      stateContainer.runtimeStateManager,
      currentTabId
    ).unifiedHistogramConfig$;

    histogramConfig$.next({
      ...histogramConfig$.getValue(),
      layoutPropsMap: {
        ...histogramConfig$.getValue().layoutPropsMap,
        [localStorageKeyPrefix ?? DEFAULT_HISTOGRAM_KEY_PREFIX]: layoutProps,
      },
    });
  }, [currentTabId, layoutProps, localStorageKeyPrefix, stateContainer.runtimeStateManager]);

  const renderCustomChartToggleActions = useCallback(
    () =>
      React.isValidElement(panelsToggle)
        ? React.cloneElement(panelsToggle, { renderedFor: 'histogram' })
        : panelsToggle,
    [panelsToggle]
  );

  return {
    renderCustomChartToggleActions,
  };
};
