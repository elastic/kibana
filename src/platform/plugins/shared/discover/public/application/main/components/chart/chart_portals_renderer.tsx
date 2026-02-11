/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type PropsWithChildren, useEffect, useRef, useMemo, useCallback } from 'react';
import { createHtmlPortalNode, type HtmlPortalNode, InPortal } from 'react-reverse-portal';
import type { UnifiedHistogramPartialLayoutProps } from '@kbn/unified-histogram';
import { UnifiedHistogramChart, useUnifiedHistogram } from '@kbn/unified-histogram';
import { useChartStyles } from '@kbn/unified-histogram/components/chart/hooks/use_chart_styles';
import { useServicesBootstrap } from '@kbn/unified-histogram/hooks/use_services_bootstrap';
import type { UnifiedMetricsGridRestorableState } from '@kbn/unified-metrics-grid';
import { KibanaSectionErrorBoundary } from '@kbn/shared-ux-error-boundary';
import { i18n } from '@kbn/i18n';
import { type UpdateESQLQueryFn, useProfileAccessor } from '../../../../context_awareness';
import { DiscoverCustomizationProvider } from '../../../../customizations';
import {
  CurrentTabProvider,
  type RuntimeStateManager,
  RuntimeStateProvider,
  selectTabRuntimeState,
  useInternalStateSelector,
  useRuntimeState,
  useCurrentTabSelector,
  useInternalStateDispatch,
  useCurrentTabAction,
  internalStateActions,
} from '../../state_management/redux';
import type { DiscoverMainContentProps } from '../layout/discover_main_content';
import { DiscoverMainProvider } from '../../state_management/discover_state_provider';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import { ScopedServicesProvider } from '../../../../components/scoped_services_provider';
import { useUnifiedHistogramRuntimeState } from './use_unified_histogram_runtime_state';
import { useUnifiedHistogramCommon } from './use_unified_histogram_common';
import type {
  ChartSectionConfigurationExtensionParams,
  ChartSectionConfiguration,
} from '../../../../context_awareness/types';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';

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
              <ChartsWrapper stateContainer={currentStateContainer} panelsToggle={panelsToggle} />
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

const ChartsWrapper = ({ stateContainer, panelsToggle }: UnifiedHistogramChartProps) => {
  const dispatch = useInternalStateDispatch();
  const getChartConfigAccessor = useProfileAccessor('getChartSectionConfiguration');

  const updateESQLQuery = useCurrentTabAction(internalStateActions.updateESQLQuery);
  const onUpdateESQLQuery: UpdateESQLQueryFn = useCallback(
    (queryOrUpdater) => {
      dispatch(updateESQLQuery({ queryOrUpdater }));
    },
    [dispatch, updateESQLQuery]
  );
  const chartSectionConfigurationExtParams: ChartSectionConfigurationExtensionParams =
    useMemo(() => {
      return {
        actions: {
          openInNewTab: (params) =>
            dispatch(internalStateActions.openInNewTabExtPointAction(params)),
          updateESQLQuery: onUpdateESQLQuery,
        },
      };
    }, [dispatch, onUpdateESQLQuery]);

  const isEsqlMode = useIsEsqlMode();
  const chartSectionConfig = useMemo<ChartSectionConfiguration>(() => {
    if (!isEsqlMode) {
      return {
        replaceDefaultChart: false,
      };
    }

    return getChartConfigAccessor(() => ({
      replaceDefaultChart: false,
    }))(chartSectionConfigurationExtParams);
  }, [getChartConfigAccessor, chartSectionConfigurationExtParams, isEsqlMode]);

  useEffect(() => {
    const histogramConfig$ = selectTabRuntimeState(
      stateContainer.runtimeStateManager,
      stateContainer.getCurrentTab().id
    ).unifiedHistogramConfig$;

    histogramConfig$.next({
      ...histogramConfig$.getValue(),
      localStorageKeyPrefix: chartSectionConfig.replaceDefaultChart
        ? chartSectionConfig.localStorageKeyPrefix
        : undefined,
    });
  }, [chartSectionConfig, stateContainer]);

  return chartSectionConfig.replaceDefaultChart ? (
    <CustomChartSectionWrapper
      stateContainer={stateContainer}
      panelsToggle={panelsToggle}
      chartSectionConfig={chartSectionConfig}
    />
  ) : (
    <UnifiedHistogramWrapper stateContainer={stateContainer} panelsToggle={panelsToggle} />
  );
};

const UnifiedHistogramWrapper = ({ stateContainer, panelsToggle }: UnifiedHistogramChartProps) => {
  const { currentTabId, unifiedHistogramProps } = useUnifiedHistogramRuntimeState(stateContainer);

  const { setUnifiedHistogramApi } = unifiedHistogramProps;
  const unifiedHistogram = useUnifiedHistogram(unifiedHistogramProps);

  useEffect(() => {
    setUnifiedHistogramApi(unifiedHistogram.api);
  }, [setUnifiedHistogramApi, unifiedHistogram.api]);

  const { renderCustomChartToggleActions } = useUnifiedHistogramCommon({
    currentTabId,
    layoutProps: unifiedHistogram.layoutProps,
    stateContainer,
    panelsToggle,
  });

  if (!unifiedHistogram.isInitialized) {
    return null;
  }

  return (
    <UnifiedHistogramChart
      {...unifiedHistogram.chartProps}
      renderCustomChartToggleActions={renderCustomChartToggleActions}
    />
  );
};

const CustomChartSectionWrapper = ({
  stateContainer,
  panelsToggle,
  chartSectionConfig,
}: UnifiedHistogramChartProps & {
  chartSectionConfig: Extract<ChartSectionConfiguration, { replaceDefaultChart: true }>;
}) => {
  const dispatch = useInternalStateDispatch();
  const { currentTabId, unifiedHistogramProps } = useUnifiedHistogramRuntimeState(
    stateContainer,
    chartSectionConfig.localStorageKeyPrefix
  );
  const localStorageKeyPrefix =
    chartSectionConfig.localStorageKeyPrefix ?? unifiedHistogramProps.localStorageKeyPrefix;

  const { setUnifiedHistogramApi, ...restProps } = unifiedHistogramProps;
  const { api, stateProps, fetch$, fetchParams, hasValidFetchParams } = useServicesBootstrap({
    ...restProps,
    initialState: unifiedHistogramProps.initialState,
    localStorageKeyPrefix,
  });

  const metricsGridState = useCurrentTabSelector((state) => state.uiState.metricsGrid);
  const setMetricsGridState = useCurrentTabAction(internalStateActions.setMetricsGridState);
  const onInitialStateChange = useCallback(
    (newMetricsGridState: Partial<UnifiedMetricsGridRestorableState>) => {
      dispatch(setMetricsGridState({ metricsGridState: newMetricsGridState }));
    },
    [setMetricsGridState, dispatch]
  );

  useEffect(() => {
    setUnifiedHistogramApi(api);
  }, [setUnifiedHistogramApi, api]);

  const layoutProps = useMemo<UnifiedHistogramPartialLayoutProps>(
    () => ({
      onTopPanelHeightChange: stateProps.onTopPanelHeightChange,
      isChartAvailable: true,
      chart: stateProps.chart,
      topPanelHeight: stateProps.topPanelHeight,
      defaultTopPanelHeight: chartSectionConfig.defaultTopPanelHeight,
    }),
    [
      chartSectionConfig.defaultTopPanelHeight,
      stateProps.chart,
      stateProps.onTopPanelHeightChange,
      stateProps.topPanelHeight,
    ]
  );

  const { renderCustomChartToggleActions } = useUnifiedHistogramCommon({
    currentTabId,
    layoutProps,
    stateContainer,
    panelsToggle,
    localStorageKeyPrefix,
  });

  const { chartToolbarCss, histogramCss } = useChartStyles(
    !!layoutProps.chart && !layoutProps.chart.hidden
  );

  if (!fetchParams || !hasValidFetchParams) {
    return null;
  }

  const isComponentVisible = !!layoutProps.chart && !layoutProps.chart.hidden;

  return (
    <KibanaSectionErrorBoundary
      sectionName={i18n.translate('discover.chart.errorBoundarySectionName', {
        defaultMessage: 'Discover chart section',
      })}
    >
      {chartSectionConfig.renderChartSection({
        histogramCss,
        chartToolbarCss,
        renderToggleActions: renderCustomChartToggleActions,
        fetch$,
        fetchParams,
        isComponentVisible,
        ...unifiedHistogramProps,
        initialState: metricsGridState,
        onInitialStateChange,
      })}
    </KibanaSectionErrorBoundary>
  );
};
