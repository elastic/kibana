/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type PropsWithChildren, useCallback, useEffect, useRef } from 'react';
import { type HtmlPortalNode, InPortal, createHtmlPortalNode } from 'react-reverse-portal';
import { UnifiedHistogramChart, useUnifiedHistogram } from '@kbn/unified-histogram';
import { DiscoverCustomizationProvider } from '../../../../customizations';
import {
  useInternalStateSelector,
  type RuntimeStateManager,
  selectTabRuntimeState,
  useRuntimeState,
  CurrentTabProvider,
  RuntimeStateProvider,
  useCurrentTabSelector,
} from '../../state_management/redux';
import type { DiscoverMainContentProps } from '../layout/discover_main_content';
import { DiscoverMainProvider } from '../../state_management/discover_state_provider';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';
import { useDiscoverHistogram } from './use_discover_histogram';
import { ScopedServicesProvider } from '../../../../components/scoped_services_provider';

export type ChartPortalNode = HtmlPortalNode;
export type ChartPortalNodes = Record<string, ChartPortalNode>;

export const ChartPortalsRenderer = ({
  runtimeStateManager,
  children,
}: PropsWithChildren<{
  runtimeStateManager: RuntimeStateManager;
}>) => {
  const allTabIds = useInternalStateSelector((state) => state.tabs.allIds);
  const currentTabId = useInternalStateSelector((state) => state.tabs.unsafeCurrentId);
  const chartPortalNodes = useRef<ChartPortalNodes>({});

  chartPortalNodes.current = updatePortals(chartPortalNodes.current, allTabIds);

  return (
    <>
      {Object.keys(chartPortalNodes.current).map((tabId) => {
        return (
          <InPortal key={tabId} node={chartPortalNodes.current[tabId]}>
            <UnifiedHistogramGuard tabId={tabId} runtimeStateManager={runtimeStateManager} />
          </InPortal>
        );
      })}
      <CurrentTabProvider
        currentTabId={currentTabId}
        currentChartPortalNode={chartPortalNodes.current[currentTabId]}
      >
        {children}
      </CurrentTabProvider>
    </>
  );
};

const updatePortals = (portals: ChartPortalNodes, tabsIds: string[]) =>
  tabsIds.reduce<ChartPortalNodes>(
    (acc, tabId) => ({
      ...acc,
      [tabId]: portals[tabId] || createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } }),
    }),
    {}
  );

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
  const currentScopedProfilesManager = useRuntimeState(
    currentTabRuntimeState.scopedProfilesManager$
  );
  const currentScopedEbtManager = useRuntimeState(currentTabRuntimeState.scopedEbtManager$);
  const currentDataView = useRuntimeState(currentTabRuntimeState.currentDataView$);
  const adHocDataViews = useRuntimeState(runtimeStateManager.adHocDataViews$);
  const isInitialized = useRef(false);

  if (
    (!isSelected && !isInitialized.current) ||
    !currentCustomizationService ||
    !currentStateContainer ||
    !currentDataView
  ) {
    return null;
  }

  isInitialized.current = true;

  return (
    <CurrentTabProvider currentTabId={tabId}>
      <DiscoverCustomizationProvider value={currentCustomizationService}>
        <DiscoverMainProvider value={currentStateContainer}>
          <RuntimeStateProvider currentDataView={currentDataView} adHocDataViews={adHocDataViews}>
            <ScopedServicesProvider
              scopedProfilesManager={currentScopedProfilesManager}
              scopedEBTManager={currentScopedEbtManager}
            >
              <UnifiedHistogramChartWrapper
                stateContainer={currentStateContainer}
                panelsToggle={panelsToggle}
              />
            </ScopedServicesProvider>
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

  const currentTabId = useCurrentTabSelector((tab) => tab.id);

  useEffect(() => {
    if (unifiedHistogram.layoutProps) {
      const currentTabRuntimeState = selectTabRuntimeState(
        stateContainer.runtimeStateManager,
        currentTabId
      );
      currentTabRuntimeState.unifiedHistogramLayoutProps$.next(unifiedHistogram.layoutProps);
    }
  }, [currentTabId, stateContainer.runtimeStateManager, unifiedHistogram.layoutProps]);

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
