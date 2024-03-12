/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiSpacer, useEuiTheme, useIsWithinBreakpoints } from '@elastic/eui';
import React, { PropsWithChildren, ReactElement, useMemo, useState } from 'react';
import { Observable } from 'rxjs';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import { css } from '@emotion/css';
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type {
  EmbeddableComponentProps,
  LensEmbeddableInput,
  LensEmbeddableOutput,
  LensSuggestionsApi,
  Suggestion,
} from '@kbn/lens-plugin/public';
import { AggregateQuery, Filter, isOfAggregateQueryType, Query, TimeRange } from '@kbn/es-query';
import {
  ResizableLayout,
  ResizableLayoutMode,
  ResizableLayoutDirection,
} from '@kbn/resizable-layout';
import { TextBasedPersistedState } from '@kbn/lens-plugin/public/datasources/text_based/types';
import { Chart, checkChartAvailability } from '../chart';
import type {
  UnifiedHistogramChartContext,
  UnifiedHistogramServices,
  UnifiedHistogramHitsContext,
  UnifiedHistogramBreakdownContext,
  UnifiedHistogramFetchStatus,
  UnifiedHistogramRequestContext,
  UnifiedHistogramChartLoadEvent,
  UnifiedHistogramInput$,
} from '../types';
import { useLensSuggestions } from './hooks/use_lens_suggestions';
import { shouldDisplayHistogram } from './helpers';

const ChartMemoized = React.memo(Chart);

const chartSpacer = <EuiSpacer size="s" />;

export interface UnifiedHistogramLayoutProps extends PropsWithChildren<unknown> {
  /**
   * Optional class name to add to the layout container
   */
  className?: string;
  /**
   * Required services
   */
  services: UnifiedHistogramServices;
  /**
   * The current data view
   */
  dataView: DataView;
  /**
   * The current query
   */
  query?: Query | AggregateQuery;
  /**
   * The current filters
   */
  filters?: Filter[];
  /**
   * The current Lens suggestion
   */
  currentSuggestion?: Suggestion;
  /**
   * Flag that indicates that a text based language is used
   */
  isPlainRecord?: boolean;
  /**
   * The current time range
   */
  timeRange?: TimeRange;
  /**
   * The relative time range, used when timeRange is an absolute range (e.g. for edit visualization button)
   */
  relativeTimeRange?: TimeRange;
  /**
   * The current columns
   */
  columns?: DatatableColumn[];
  /**
   * Context object for requests made by Unified Histogram components -- optional
   */
  request?: UnifiedHistogramRequestContext;
  /**
   * Context object for the hits count -- leave undefined to hide the hits count
   */
  hits?: UnifiedHistogramHitsContext;
  lensAdapters?: UnifiedHistogramChartLoadEvent['adapters'];
  lensEmbeddableOutput$?: Observable<LensEmbeddableOutput>;
  /**
   * Context object for the chart -- leave undefined to hide the chart
   */
  chart?: UnifiedHistogramChartContext;
  /**
   * Context object for the breakdown -- leave undefined to hide the breakdown
   */
  breakdown?: UnifiedHistogramBreakdownContext;
  /**
   * The parent container element, used to calculate the layout size
   */
  container: HTMLElement | null;
  /**
   * Current top panel height -- leave undefined to use the default
   */
  topPanelHeight?: number;
  /**
   * This element would replace the default chart toggle buttons
   */
  renderCustomChartToggleActions?: () => ReactElement | undefined;
  /**
   * Disable automatic refetching based on props changes, and instead wait for a `refetch` message
   */
  disableAutoFetching?: boolean;
  /**
   * Disable triggers for the Lens embeddable
   */
  disableTriggers?: LensEmbeddableInput['disableTriggers'];
  /**
   * Disabled action IDs for the Lens embeddable
   */
  disabledActions?: LensEmbeddableInput['disabledActions'];
  /**
   * Input observable
   */
  input$?: UnifiedHistogramInput$;
  /**
   * Flag indicating that the chart is currently loading
   */
  isChartLoading: boolean;
  /**
   * The Lens suggestions API
   */
  lensSuggestionsApi: LensSuggestionsApi;
  /**
   * Callback to update the topPanelHeight prop when a resize is triggered
   */
  onTopPanelHeightChange?: (topPanelHeight: number | undefined) => void;
  /**
   * Callback to hide or show the chart -- should set {@link UnifiedHistogramChartContext.hidden} to chartHidden
   */
  onChartHiddenChange?: (chartHidden: boolean) => void;
  /**
   * Callback to update the time interval -- should set {@link UnifiedHistogramChartContext.timeInterval} to timeInterval
   */
  onTimeIntervalChange?: (timeInterval: string) => void;
  /**
   * Callback to update the breakdown field -- should set {@link UnifiedHistogramBreakdownContext.field} to breakdownField
   */
  onBreakdownFieldChange?: (breakdownField: DataViewField | undefined) => void;
  /**
   * Callback to update the suggested chart
   */
  onSuggestionChange?: (suggestion: Suggestion | undefined) => void;
  /**
   * Callback to update the total hits -- should set {@link UnifiedHistogramHitsContext.status} to status
   * and {@link UnifiedHistogramHitsContext.total} to result
   */
  onTotalHitsChange?: (status: UnifiedHistogramFetchStatus, result?: number | Error) => void;
  /**
   * Called when the histogram loading status changes
   */
  onChartLoad?: (event: UnifiedHistogramChartLoadEvent) => void;
  /**
   * Callback to pass to the Lens embeddable to handle filter changes
   */
  onFilter?: LensEmbeddableInput['onFilter'];
  /**
   * Callback to pass to the Lens embeddable to handle brush events
   */
  onBrushEnd?: LensEmbeddableInput['onBrushEnd'];
  /**
   * Allows users to enable/disable default actions
   */
  withDefaultActions?: EmbeddableComponentProps['withDefaultActions'];

  table?: Datatable;
  abortController?: AbortController;
}

export const UnifiedHistogramLayout = ({
  className,
  services,
  dataView,
  query,
  filters,
  currentSuggestion: originalSuggestion,
  isChartLoading,
  isPlainRecord,
  timeRange,
  relativeTimeRange,
  columns,
  request,
  hits,
  lensAdapters,
  lensEmbeddableOutput$,
  chart: originalChart,
  breakdown,
  container,
  topPanelHeight,
  renderCustomChartToggleActions,
  disableAutoFetching,
  disableTriggers,
  disabledActions,
  lensSuggestionsApi,
  input$,
  table,
  onTopPanelHeightChange,
  onChartHiddenChange,
  onTimeIntervalChange,
  onBreakdownFieldChange,
  onSuggestionChange,
  onTotalHitsChange,
  onChartLoad,
  onFilter,
  onBrushEnd,
  children,
  withDefaultActions,
  abortController,
}: UnifiedHistogramLayoutProps) => {
  const {
    allSuggestions,
    currentSuggestion,
    suggestionUnsupported,
    isOnHistogramMode,
    histogramQuery,
  } = useLensSuggestions({
    dataView,
    query,
    originalSuggestion,
    isPlainRecord,
    columns,
    timeRange,
    data: services.data,
    lensSuggestionsApi,
    onSuggestionChange,
  });

  // apply table to current suggestion
  const usedSuggestion = useMemo(() => {
    if (
      currentSuggestion &&
      table &&
      query &&
      isOfAggregateQueryType(query) &&
      !shouldDisplayHistogram(query)
    ) {
      const { layers } = currentSuggestion.datasourceState as TextBasedPersistedState;

      const newState = {
        ...currentSuggestion,
        datasourceState: {
          ...(currentSuggestion.datasourceState as TextBasedPersistedState),
          layers: {} as Record<string, unknown>,
        },
      };

      for (const key of Object.keys(layers)) {
        const newLayer = { ...layers[key], table };
        newState.datasourceState.layers[key] = newLayer;
      }

      return newState;
    } else {
      return currentSuggestion;
    }
  }, [currentSuggestion, query, table]);

  const chart = suggestionUnsupported ? undefined : originalChart;
  const isChartAvailable = checkChartAvailability({ chart, dataView, isPlainRecord });

  const [topPanelNode] = useState(() =>
    createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } })
  );
  const [mainPanelNode] = useState(() =>
    createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } })
  );

  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const showFixedPanels = isMobile || !chart || chart.hidden;
  const { euiTheme } = useEuiTheme();
  const defaultTopPanelHeight = euiTheme.base * 12;
  const minMainPanelHeight = euiTheme.base * 10;

  const chartClassName =
    isMobile && chart && !chart.hidden
      ? css`
          height: ${defaultTopPanelHeight}px;
        `
      : 'eui-fullHeight';

  const panelsMode =
    chart || hits
      ? showFixedPanels
        ? ResizableLayoutMode.Static
        : ResizableLayoutMode.Resizable
      : ResizableLayoutMode.Single;

  const currentTopPanelHeight = topPanelHeight ?? defaultTopPanelHeight;

  return (
    <>
      <InPortal node={topPanelNode}>
        <ChartMemoized
          abortController={abortController}
          isChartAvailable={isChartAvailable}
          className={chartClassName}
          services={services}
          dataView={dataView}
          query={query}
          filters={filters}
          timeRange={timeRange}
          relativeTimeRange={relativeTimeRange}
          request={request}
          hits={hits}
          currentSuggestion={usedSuggestion}
          isChartLoading={isChartLoading}
          allSuggestions={allSuggestions}
          isPlainRecord={isPlainRecord}
          chart={chart}
          breakdown={breakdown}
          renderCustomChartToggleActions={renderCustomChartToggleActions}
          appendHistogram={chartSpacer}
          disableAutoFetching={disableAutoFetching}
          disableTriggers={disableTriggers}
          disabledActions={disabledActions}
          input$={input$}
          onChartHiddenChange={onChartHiddenChange}
          onTimeIntervalChange={onTimeIntervalChange}
          onBreakdownFieldChange={onBreakdownFieldChange}
          onSuggestionChange={onSuggestionChange}
          onTotalHitsChange={onTotalHitsChange}
          onChartLoad={onChartLoad}
          onFilter={onFilter}
          onBrushEnd={onBrushEnd}
          lensAdapters={lensAdapters}
          lensEmbeddableOutput$={lensEmbeddableOutput$}
          isOnHistogramMode={isOnHistogramMode}
          histogramQuery={histogramQuery}
          withDefaultActions={withDefaultActions}
        />
      </InPortal>
      <InPortal node={mainPanelNode}>
        {React.isValidElement(children)
          ? // @ts-expect-error upgrade typescript v4.9.5
            React.cloneElement(children, { isChartAvailable })
          : children}
      </InPortal>
      <ResizableLayout
        className={className}
        mode={panelsMode}
        direction={ResizableLayoutDirection.Vertical}
        container={container}
        fixedPanelSize={currentTopPanelHeight}
        minFixedPanelSize={defaultTopPanelHeight}
        minFlexPanelSize={minMainPanelHeight}
        fixedPanel={<OutPortal node={topPanelNode} />}
        flexPanel={<OutPortal node={mainPanelNode} />}
        data-test-subj="unifiedHistogram"
        onFixedPanelSizeChange={onTopPanelHeightChange}
      />
    </>
  );
};
