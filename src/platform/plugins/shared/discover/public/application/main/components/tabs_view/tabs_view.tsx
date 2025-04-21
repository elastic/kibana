/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type TabItem, UnifiedTabs } from '@kbn/unified-tabs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { pick } from 'lodash';
import { type HtmlPortalNode, createHtmlPortalNode, InPortal } from 'react-reverse-portal';
import { UnifiedHistogramChart, useUnifiedHistogram } from '@kbn/unified-histogram-plugin/public';
import { DiscoverSessionView, type DiscoverSessionViewProps } from '../session_view';
import type { RuntimeStateManager } from '../../state_management/redux';
import {
  CurrentTabProvider,
  RuntimeStateProvider,
  createTabItem,
  internalStateActions,
  selectAllTabs,
  selectTabRuntimeState,
  useInternalStateDispatch,
  useInternalStateSelector,
  useRuntimeState,
} from '../../state_management/redux';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { usePreviewData } from './use_preview_data';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';
import { useDiscoverHistogram2 } from '../layout/use_discover_histogram_2';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import { DiscoverCustomizationProvider } from '../../../../customizations';
import { DiscoverMainProvider } from '../../state_management/discover_state_provider';
import type { DiscoverMainContentProps } from '../layout/discover_main_content';

export const TabsView = (props: DiscoverSessionViewProps) => {
  const services = useDiscoverServices();
  const dispatch = useInternalStateDispatch();
  const allTabs = useInternalStateSelector(selectAllTabs);
  const currentTabId = useInternalStateSelector((state) => state.tabs.unsafeCurrentId);
  const [initialItems] = useState<TabItem[]>(() => allTabs.map((tab) => pick(tab, 'id', 'label')));
  const { getPreviewData } = usePreviewData(props.runtimeStateManager);
  const chartPortalsInitialized = useRef(false);
  const chartPortalNodes = useRef<Record<string, HtmlPortalNode>>({});

  if (!chartPortalsInitialized.current) {
    chartPortalsInitialized.current = true;
    chartPortalNodes.current = updatePortals(chartPortalNodes.current, allTabs);
  }

  return (
    <>
      {Object.keys(chartPortalNodes.current).map((tabId) => {
        return (
          <InPortal key={tabId} node={chartPortalNodes.current[tabId]}>
            <UnifiedHistogramWrapper
              tabId={tabId}
              isSelected={false}
              runtimeStateManager={props.runtimeStateManager}
            />
          </InPortal>
        );
      })}
      <UnifiedTabs
        services={services}
        initialItems={initialItems}
        onChanged={(updateState) => {
          chartPortalNodes.current = updatePortals(chartPortalNodes.current, updateState.items);
          dispatch(internalStateActions.updateTabs(updateState));
        }}
        createItem={() => createTabItem(allTabs)}
        getPreviewData={getPreviewData}
        renderContent={() => (
          <CurrentTabProvider
            currentTabId={currentTabId}
            chartPortalNode={chartPortalNodes.current[currentTabId]}
          >
            <DiscoverSessionView key={currentTabId} {...props} />
          </CurrentTabProvider>
        )}
      />
    </>
  );
};

const updatePortals = (portals: Record<string, HtmlPortalNode>, tabs: Array<{ id: string }>) =>
  tabs.reduce<Record<string, HtmlPortalNode>>(
    (acc, tab) => ({
      ...acc,
      [tab.id]: portals[tab.id] || createHtmlPortalNode({ attributes: { style: 'height: 100%;' } }),
    }),
    {}
  );

interface UnifiedHistogramWrapperProps {
  tabId: string;
  isSelected: boolean;
  runtimeStateManager: RuntimeStateManager;
  panelsToggle?: DiscoverMainContentProps['panelsToggle'];
}

const UnifiedHistogramWrapper = ({
  tabId,
  isSelected,
  runtimeStateManager,
  panelsToggle,
}: UnifiedHistogramWrapperProps) => {
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

type UnifiedHistogramChartProps = Pick<UnifiedHistogramWrapperProps, 'panelsToggle'> & {
  stateContainer: DiscoverStateContainer;
};

const UnifiedHistogramChartWrapper = ({
  stateContainer,
  panelsToggle,
}: UnifiedHistogramChartProps) => {
  const isEsqlMode = useIsEsqlMode();
  const { setUnifiedHistogramApi, ...unifiedHistogramProps } =
    useDiscoverHistogram2(stateContainer);
  const unifiedHistogram = useUnifiedHistogram(unifiedHistogramProps);
  const renderCustomChartToggleActions = useCallback(
    () =>
      React.isValidElement(panelsToggle)
        ? React.cloneElement(panelsToggle, { renderedFor: 'histogram' })
        : panelsToggle,
    [panelsToggle]
  );

  useEffect(() => {
    if (unifiedHistogram.isInitialized) {
      setUnifiedHistogramApi(unifiedHistogram.api);
    }
  }, [setUnifiedHistogramApi, unifiedHistogram.api, unifiedHistogram.isInitialized]);

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
