/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UnifiedHistogramPartialLayoutProps } from '@kbn/unified-histogram';
import { useCallback, useEffect, type ReactElement } from 'react';
import {
  DEFAULT_HISTOGRAM_KEY_PREFIX,
  selectTabRuntimeState,
  useRuntimeStateManager,
} from '../../state_management/redux';

export const useUnifiedHistogramCommon = ({
  currentTabId,
  layoutProps,
  panelsToggle,
  localStorageKeyPrefix,
}: {
  currentTabId: string;
  layoutProps?: UnifiedHistogramPartialLayoutProps;
  panelsToggle?: ReactElement;
  localStorageKeyPrefix?: string;
}) => {
  const runtimeStateManager = useRuntimeStateManager();

  useEffect(() => {
    if (!layoutProps) {
      return;
    }

    const histogramConfig$ = selectTabRuntimeState(
      runtimeStateManager,
      currentTabId
    ).unifiedHistogramConfig$;

    histogramConfig$.next({
      ...histogramConfig$.getValue(),
      layoutPropsMap: {
        ...histogramConfig$.getValue().layoutPropsMap,
        [localStorageKeyPrefix ?? DEFAULT_HISTOGRAM_KEY_PREFIX]: layoutProps,
      },
    });
  }, [currentTabId, layoutProps, localStorageKeyPrefix, runtimeStateManager]);

  const renderCustomChartToggleActions = useCallback(
    () => panelsToggle ?? undefined,
    [panelsToggle]
  );

  return {
    renderCustomChartToggleActions,
  };
};
