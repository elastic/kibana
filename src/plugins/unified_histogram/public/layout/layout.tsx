/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiSpacer, useEuiTheme, useIsWithinBreakpoints } from '@elastic/eui';
import { PropsWithChildren, ReactElement, RefObject } from 'react';
import React, { useMemo } from 'react';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import { css } from '@emotion/css';
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { LensEmbeddableInput, LensSuggestionsApi, Suggestion } from '@kbn/lens-plugin/public';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { Chart } from '../chart';
import { Panels, PANELS_MODE } from '../panels';
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
  lensTablesAdapter?: Record<string, Datatable>;
  /**
   * Context object for the chart -- leave undefined to hide the chart
   */
  chart?: UnifiedHistogramChartContext;
  /**
   * Context object for the breakdown -- leave undefined to hide the breakdown
   */
  breakdown?: UnifiedHistogramBreakdownContext;
  /**
   * Ref to the element wrapping the layout which will be used for resize calculations
   */
  resizeRef: RefObject<HTMLDivElement>;
  /**
   * Current top panel height -- leave undefined to use the default
   */
  topPanelHeight?: number;
  /**
   * Append a custom element to the right of the hits count
   */
  appendHitsCounter?: ReactElement;
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
}

export const UnifiedHistogramLayout = ({
  className,
  services,
  dataView,
  query,
  filters,
  currentSuggestion: originalSuggestion,
  isPlainRecord,
  timeRange,
  relativeTimeRange,
  columns,
  request,
  hits,
  lensTablesAdapter,
  chart: originalChart,
  breakdown,
  resizeRef,
  topPanelHeight,
  appendHitsCounter,
  disableAutoFetching,
  disableTriggers,
  disabledActions,
  lensSuggestionsApi,
  input$,
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
}: UnifiedHistogramLayoutProps) => {
  const { allSuggestions, currentSuggestion, suggestionUnsupported } = useLensSuggestions({
    dataView,
    query,
    originalSuggestion,
    isPlainRecord,
    columns,
    lensSuggestionsApi,
    onSuggestionChange,
  });

  const chart = suggestionUnsupported ? undefined : originalChart;

  const topPanelNode = useMemo(
    () => createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } }),
    []
  );

  const mainPanelNode = useMemo(
    () => createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } }),
    []
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
        ? PANELS_MODE.FIXED
        : PANELS_MODE.RESIZABLE
      : PANELS_MODE.SINGLE;

  const currentTopPanelHeight = topPanelHeight ?? defaultTopPanelHeight;

  const onResetChartHeight = useMemo(() => {
    return currentTopPanelHeight !== defaultTopPanelHeight && panelsMode === PANELS_MODE.RESIZABLE
      ? () => onTopPanelHeightChange?.(undefined)
      : undefined;
  }, [currentTopPanelHeight, defaultTopPanelHeight, onTopPanelHeightChange, panelsMode]);

  return (
    <>
      <InPortal node={topPanelNode}>
        <Chart
          className={chartClassName}
          services={services}
          dataView={dataView}
          query={query}
          filters={filters}
          timeRange={timeRange}
          relativeTimeRange={relativeTimeRange}
          request={request}
          hits={hits}
          currentSuggestion={currentSuggestion}
          allSuggestions={allSuggestions}
          isPlainRecord={isPlainRecord}
          chart={chart}
          breakdown={breakdown}
          appendHitsCounter={appendHitsCounter}
          appendHistogram={showFixedPanels ? <EuiSpacer size="s" /> : <EuiSpacer size="l" />}
          disableAutoFetching={disableAutoFetching}
          disableTriggers={disableTriggers}
          disabledActions={disabledActions}
          input$={input$}
          onResetChartHeight={onResetChartHeight}
          onChartHiddenChange={onChartHiddenChange}
          onTimeIntervalChange={onTimeIntervalChange}
          onBreakdownFieldChange={onBreakdownFieldChange}
          onSuggestionChange={onSuggestionChange}
          onTotalHitsChange={onTotalHitsChange}
          onChartLoad={onChartLoad}
          onFilter={onFilter}
          onBrushEnd={onBrushEnd}
          lensTablesAdapter={lensTablesAdapter}
        />
      </InPortal>
      <InPortal node={mainPanelNode}>{children}</InPortal>
      <Panels
        className={className}
        mode={panelsMode}
        resizeRef={resizeRef}
        topPanelHeight={currentTopPanelHeight}
        minTopPanelHeight={defaultTopPanelHeight}
        minMainPanelHeight={minMainPanelHeight}
        topPanel={<OutPortal node={topPanelNode} />}
        mainPanel={<OutPortal node={mainPanelNode} />}
        onTopPanelHeightChange={onTopPanelHeightChange}
      />
    </>
  );
};
