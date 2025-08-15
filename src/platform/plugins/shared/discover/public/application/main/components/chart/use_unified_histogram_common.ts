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
import { selectTabRuntimeState } from '../../state_management/redux';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';

export const useUnifiedHistogramCommon = ({
  currentTabId,
  layoutProps,
  stateContainer,
  panelsToggle,
}: {
  currentTabId: string;
  layoutProps?: UnifiedHistogramPartialLayoutProps;
  stateContainer: DiscoverStateContainer;
  panelsToggle?: DiscoverMainContentProps['panelsToggle'];
}) => {
  useEffect(() => {
    if (layoutProps) {
      selectTabRuntimeState(
        stateContainer.runtimeStateManager,
        currentTabId
      ).unifiedHistogramLayoutProps$.next(layoutProps);
    }
  }, [currentTabId, stateContainer.runtimeStateManager, layoutProps]);

  const isEsqlMode = useIsEsqlMode();
  const renderCustomChartToggleActions = useCallback(
    () =>
      React.isValidElement(panelsToggle)
        ? React.cloneElement(panelsToggle, { renderedFor: 'histogram' })
        : panelsToggle,
    [panelsToggle]
  );

  return {
    isEsqlMode,
    renderCustomChartToggleActions,
  };
};
