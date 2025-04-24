/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { InPortal } from 'react-reverse-portal';
import { UnifiedHistogramChart, useUnifiedHistogram } from '@kbn/unified-histogram-plugin/public';
import { DiscoverCustomizationProvider } from '../../../../customizations';
import type { ChartPortalNodes } from './use_chart_portals';
import {
  useInternalStateSelector,
  type RuntimeStateManager,
  selectTabRuntimeState,
  useRuntimeState,
  CurrentTabProvider,
  RuntimeStateProvider,
  useInternalStateDispatch,
  useCurrentTabAction,
  internalStateActions,
} from '../../state_management/redux';
import type { DiscoverMainContentProps } from '../layout/discover_main_content';
import { DiscoverMainProvider } from '../../state_management/discover_state_provider';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';
import { useDiscoverHistogram } from './use_discover_histogram';

export const ChartPortalsRenderer = ({
  chartPortalNodes,
  runtimeStateManager,
}: {
  chartPortalNodes: ChartPortalNodes;
  runtimeStateManager: RuntimeStateManager;
}) =>
  Object.keys(chartPortalNodes).map((tabId) => {
    return (
      <InPortal key={tabId} node={chartPortalNodes[tabId]}>
        <UnifiedHistogramGuard tabId={tabId} runtimeStateManager={runtimeStateManager} />
      </InPortal>
    );
  });

interface UnifiedHistogramGuardProps {
  tabId: string;
  runtimeStateManager: RuntimeStateManager;
  panelsToggle?: DiscoverMainContentProps['panelsToggle'];
}

const UnifiedHistogramGuard = ({
  tabId,
  runtimeStateManager,
  panelsToggle,
}: UnifiedHistogramGuardProps) => {
  const isSelected = useInternalStateSelector((state) => state.tabs.unsafeCurrentId === tabId);
  const currentTabRuntimeState = selectTabRuntimeState(runtimeStateManager, tabId);
  const currentCustomizationService = useRuntimeState(currentTabRuntimeState.customizationService$);
  const currentStateContainer = useRuntimeState(currentTabRuntimeState.stateContainer$);
  const currentDataView = useRuntimeState(currentTabRuntimeState.currentDataView$);
  const adHocDataViews = useRuntimeState(runtimeStateManager.adHocDataViews$);
  const isInitialized = useRef(false);

  if (
    (!isSelected && !isInitialized.current) ||
    !currentCustomizationService ||
    !currentStateContainer ||
    !currentDataView ||
    !currentTabRuntimeState
  ) {
    return null;
  }

  isInitialized.current = true;

  return (
    <CurrentTabProvider currentTabId={tabId}>
      <DiscoverCustomizationProvider value={currentCustomizationService}>
        <DiscoverMainProvider value={currentStateContainer}>
          <RuntimeStateProvider currentDataView={currentDataView} adHocDataViews={adHocDataViews}>
            <UnifiedHistogramChartWrapper
              stateContainer={currentStateContainer}
              panelsToggle={panelsToggle}
            />
          </RuntimeStateProvider>
        </DiscoverMainProvider>
      </DiscoverCustomizationProvider>
    </CurrentTabProvider>
  );
};

type UnifiedHistogramChartProps = Pick<UnifiedHistogramGuardProps, 'panelsToggle'> & {
  stateContainer: DiscoverStateContainer;
};

const UnifiedHistogramChartWrapper = ({
  stateContainer,
  panelsToggle,
}: UnifiedHistogramChartProps) => {
  const { setUnifiedHistogramApi, ...unifiedHistogramProps } = useDiscoverHistogram(stateContainer);
  const unifiedHistogram = useUnifiedHistogram(unifiedHistogramProps);

  useEffect(() => {
    if (unifiedHistogram.isInitialized) {
      setUnifiedHistogramApi(unifiedHistogram.api);
    }
  }, [setUnifiedHistogramApi, unifiedHistogram.api, unifiedHistogram.isInitialized]);

  const dispatch = useInternalStateDispatch();
  const setUnifiedHistogramLayoutProps = useCurrentTabAction(
    internalStateActions.setUnifiedHistogramLayoutProps
  );

  useEffect(() => {
    if (unifiedHistogram.layoutProps) {
      dispatch(
        setUnifiedHistogramLayoutProps({
          unifiedHistogramLayoutProps: unifiedHistogram.layoutProps,
        })
      );
    }
  }, [dispatch, setUnifiedHistogramLayoutProps, unifiedHistogram.layoutProps]);

  const isEsqlMode = useIsEsqlMode();
  const renderCustomChartToggleActions = useCallback(
    () =>
      React.isValidElement(panelsToggle)
        ? React.cloneElement(panelsToggle, { renderedFor: 'histogram' })
        : panelsToggle,
    [panelsToggle]
  );

  // Initialized when the first search has been requested or
  // when in ES|QL mode since search sessions are not supported
  if (!unifiedHistogram.isInitialized || (!unifiedHistogramProps.searchSessionId && !isEsqlMode)) {
    return null;
  }

  return (
    <UnifiedHistogramChart
      {...unifiedHistogram.chartProps}
      renderCustomChartToggleActions={renderCustomChartToggleActions}
    />
  );
};
