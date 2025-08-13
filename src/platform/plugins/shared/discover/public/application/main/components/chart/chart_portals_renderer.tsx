/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useState,
} from 'react';
import { createHtmlPortalNode, type HtmlPortalNode, InPortal } from 'react-reverse-portal';
import type {
  ChartSectionConfiguration,
  UnifiedHistogramPartialLayoutProps,
} from '@kbn/unified-histogram';
import { UnifiedHistogramChart, useUnifiedHistogram } from '@kbn/unified-histogram';
import { useEuiTheme } from '@elastic/eui';
import { useStateProps } from '@kbn/unified-histogram/hooks/use_state_props';
import { createStateService } from '@kbn/unified-histogram/services/state_service';
import { useChartStyles } from '@kbn/unified-histogram/components/chart/hooks/use_chart_styles';
import useMount from 'react-use/lib/useMount';
import { pick } from 'lodash';
import { Subject } from 'rxjs';
import type { UnifiedHistogramInputMessage } from '@kbn/unified-histogram/types';
import { useProfileAccessor } from '../../../../context_awareness';
import { DiscoverCustomizationProvider } from '../../../../customizations';
import {
  CurrentTabProvider,
  type RuntimeStateManager,
  RuntimeStateProvider,
  selectRestorableTabRuntimeHistogramLayoutProps,
  selectTabRuntimeState,
  useCurrentTabSelector,
  useInternalStateSelector,
  useRuntimeState,
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
  const getChartConfigAccessor = useProfileAccessor('getChartSectionConfiguration');
  const chartSectionConfig = useMemo(
    () =>
      getChartConfigAccessor(() => ({
        replaceDefaultHistogram: false,
      }))(),
    [getChartConfigAccessor]
  );

  // I didn't want to touch the UnifiedHistogramWrapper. Instead we route the code to render another component
  // This causes some code duplication, which we might solve encapsulating components/logic in reausable hooks/components
  return chartSectionConfig.replaceDefaultHistogram ? (
    <CustomChartSectionWrapper
      stateContainer={stateContainer}
      panelsToggle={panelsToggle}
      chartSectionConfig={chartSectionConfig}
    />
  ) : (
    <UnifiedHistogramWrapper stateContainer={stateContainer} panelsToggle={panelsToggle} />
  );
};

function useUnifiedHistogramWithRuntimeState(
  stateContainer: UnifiedHistogramChartProps['stateContainer']
) {
  const currentTabId = useCurrentTabSelector((tab) => tab.id);

  const options = useMemo(
    () => ({
      initialLayoutProps: selectRestorableTabRuntimeHistogramLayoutProps(
        stateContainer.runtimeStateManager,
        currentTabId
      ),
    }),
    [stateContainer.runtimeStateManager, currentTabId]
  );

  const unifiedHistogramProps = useDiscoverHistogram(stateContainer, options);

  return { currentTabId, unifiedHistogramProps };
}

const UnifiedHistogramWrapper = ({ stateContainer, panelsToggle }: UnifiedHistogramChartProps) => {
  const { currentTabId, unifiedHistogramProps } =
    useUnifiedHistogramWithRuntimeState(stateContainer);
  const { setUnifiedHistogramApi, ...restProps } = unifiedHistogramProps;

  const unifiedHistogram = useUnifiedHistogram(unifiedHistogramProps);

  useEffect(() => {
    if (unifiedHistogram.isInitialized) {
      setUnifiedHistogramApi(unifiedHistogram.api);
    }
  }, [setUnifiedHistogramApi, unifiedHistogram.api, unifiedHistogram.isInitialized]);

  useEffect(() => {
    if (unifiedHistogram.layoutProps) {
      selectTabRuntimeState(
        stateContainer.runtimeStateManager,
        currentTabId
      ).unifiedHistogramLayoutProps$.next(unifiedHistogram.layoutProps);
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

  if (!unifiedHistogram.isInitialized || (!restProps.searchSessionId && !isEsqlMode)) {
    return null;
  }

  return (
    <UnifiedHistogramChart
      {...unifiedHistogram.chartProps}
      renderCustomChartToggleActions={renderCustomChartToggleActions}
    />
  );
};

/**
 * Custom chart section wrapper for the unified histogram. Many of the hooks here were extracted from `useUnifiedHistogram`
 * There are many things happening on `useUnifiedHistogram` but I'm not sure if they're all necessary for custom components.
 * We should probably centralize the basic logic somewhere else
 */
const CustomChartSectionWrapper = ({
  stateContainer,
  panelsToggle,
  chartSectionConfig,
}: UnifiedHistogramChartProps & { chartSectionConfig: ChartSectionConfiguration }) => {
  const { currentTabId, unifiedHistogramProps } =
    useUnifiedHistogramWithRuntimeState(stateContainer);

  const { setUnifiedHistogramApi, ...restProps } = unifiedHistogramProps;

  const isEsqlMode = useIsEsqlMode();

  const [input$] = useState(() => new Subject<UnifiedHistogramInputMessage>());

  // Extracted from useUnifiedHistogram
  const [stateService] = useState(() => {
    const { services, initialState, localStorageKeyPrefix } = restProps;
    return createStateService({ services, initialState, localStorageKeyPrefix });
  });

  // Extracted from useUnifiedHistogram
  useMount(async () => {
    setUnifiedHistogramApi({
      fetch: () => {
        input$.next({ type: 'fetch' });
      },
      ...pick(
        stateService,
        'state$',
        'setChartHidden',
        'setTopPanelHeight',
        'setTimeInterval',
        'setTotalHits'
      ),
    });
  });

  const { euiTheme } = useEuiTheme();

  // TODO: Figure out a way to calculate this in a more dynamic way
  const defaultTopPanelHeight = euiTheme.base * 30;

  // Extracted from useUnifiedHistogram
  const { onTopPanelHeightChange, chart } = useStateProps({
    services: restProps.services,
    localStorageKeyPrefix: restProps.localStorageKeyPrefix,
    stateService,
    dataView: restProps.dataView,
    query: restProps.query,
    searchSessionId: restProps.searchSessionId,
    requestAdapter: restProps.requestAdapter,
    columns: restProps.columns,
    breakdownField: undefined,
    onBreakdownFieldChange: undefined,
    onVisContextChanged: undefined,
  });

  const layoutProps = useMemo<UnifiedHistogramPartialLayoutProps>(
    () => ({
      onTopPanelHeightChange,
      // always available?
      isChartAvailable: true,
      // we need this to control the chart section visibility
      chart,
      topPanelHeight: defaultTopPanelHeight,
    }),
    [onTopPanelHeightChange, chart, defaultTopPanelHeight]
  );

  useEffect(() => {
    selectTabRuntimeState(
      stateContainer.runtimeStateManager,
      currentTabId
    ).unifiedHistogramLayoutProps$.next(layoutProps);
  }, [currentTabId, layoutProps, stateContainer.runtimeStateManager]);

  const renderCustomChartToggleActions = useCallback(
    () =>
      React.isValidElement(panelsToggle)
        ? React.cloneElement(panelsToggle, { renderedFor: 'histogram' }) // should we have a another `renderedFor` option?
        : panelsToggle,
    [panelsToggle]
  );

  const { chartToolbarCss, histogramCss } = useChartStyles(
    !!layoutProps.chart && !layoutProps.chart.hidden
  );

  if (!unifiedHistogramProps.searchSessionId && !isEsqlMode) {
    return null;
  }

  const Component = chartSectionConfig.Component;
  return Component && !!layoutProps.chart && !layoutProps.chart.hidden ? (
    <Component
      {...unifiedHistogramProps}
      histogramCss={histogramCss}
      chartToolbarCss={chartToolbarCss}
      renderToggleActions={renderCustomChartToggleActions}
    />
  ) : null;
};
