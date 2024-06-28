/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiSpacer, useEuiTheme, useIsWithinBreakpoints } from '@elastic/eui';
import React, { PropsWithChildren, ReactElement, useEffect, useMemo, useState } from 'react';
import { Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import { css } from '@emotion/css';
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type {
  EmbeddableComponentProps,
  LensEmbeddableInput,
  LensEmbeddableOutput,
  LensSuggestionsApi,
} from '@kbn/lens-plugin/public';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import {
  ResizableLayout,
  ResizableLayoutDirection,
  ResizableLayoutMode,
} from '@kbn/resizable-layout';
import { Chart, checkChartAvailability } from '../chart';
import {
  UnifiedHistogramVisContext,
  UnifiedHistogramBreakdownContext,
  UnifiedHistogramChartContext,
  UnifiedHistogramChartLoadEvent,
  UnifiedHistogramFetchStatus,
  UnifiedHistogramHitsContext,
  UnifiedHistogramInput$,
  UnifiedHistogramRequestContext,
  UnifiedHistogramServices,
  UnifiedHistogramSuggestionContext,
  UnifiedHistogramExternalVisContextStatus,
} from '../types';
import { UnifiedHistogramSuggestionType } from '../types';
import { LensVisService } from '../services/lens_vis_service';
import { useRequestParams } from '../hooks/use_request_params';

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
   * The external custom Lens vis
   */
  externalVisContext?: UnifiedHistogramVisContext;
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
  onSuggestionContextChange: (
    suggestionContext: UnifiedHistogramSuggestionContext | undefined
  ) => void;
  /**
   * Callback to notify about the change in Lens attributes
   */
  onVisContextChanged?: (
    visContext: UnifiedHistogramVisContext | undefined,
    externalVisContextStatus: UnifiedHistogramExternalVisContextStatus
  ) => void;
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
  query: originalQuery,
  filters: originalFilters,
  externalVisContext,
  isChartLoading,
  isPlainRecord,
  timeRange: originalTimeRange,
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
  onSuggestionContextChange,
  onVisContextChanged,
  onTotalHitsChange,
  onChartLoad,
  onFilter,
  onBrushEnd,
  children,
  withDefaultActions,
  abortController,
}: UnifiedHistogramLayoutProps) => {
  const columnsMap = useMemo(() => {
    if (!columns?.length) {
      return undefined;
    }

    return columns.reduce((acc, column) => {
      acc[column.id] = column;
      return acc;
    }, {} as Record<string, DatatableColumn>);
  }, [columns]);

  const requestParams = useRequestParams({
    services,
    query: originalQuery,
    filters: originalFilters,
    timeRange: originalTimeRange,
  });

  const [lensVisService] = useState(() => new LensVisService({ services, lensSuggestionsApi }));
  const lensVisServiceCurrentSuggestionContext = useObservable(
    lensVisService.currentSuggestionContext$
  );

  const originalChartTimeInterval = originalChart?.timeInterval;
  useEffect(() => {
    if (isChartLoading) {
      return;
    }

    lensVisService.update({
      externalVisContext,
      queryParams: {
        dataView,
        query: requestParams.query,
        filters: requestParams.filters,
        timeRange: originalTimeRange,
        isPlainRecord,
        columns,
        columnsMap,
      },
      timeInterval: originalChartTimeInterval,
      breakdownField: breakdown?.field,
      table,
      onSuggestionContextChange,
      onVisContextChanged: isPlainRecord ? onVisContextChanged : undefined,
    });
  }, [
    lensVisService,
    dataView,
    requestParams.query,
    requestParams.filters,
    originalTimeRange,
    originalChartTimeInterval,
    isPlainRecord,
    columns,
    columnsMap,
    breakdown,
    externalVisContext,
    onSuggestionContextChange,
    onVisContextChanged,
    isChartLoading,
    table,
  ]);

  const chart =
    !lensVisServiceCurrentSuggestionContext?.type ||
    lensVisServiceCurrentSuggestionContext.type === UnifiedHistogramSuggestionType.unsupported
      ? undefined
      : originalChart;
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
          requestParams={requestParams}
          relativeTimeRange={relativeTimeRange}
          request={request}
          hits={hits}
          lensVisService={lensVisService}
          isChartLoading={isChartLoading}
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
          onTotalHitsChange={onTotalHitsChange}
          onChartLoad={onChartLoad}
          onFilter={onFilter}
          onBrushEnd={onBrushEnd}
          lensAdapters={lensAdapters}
          lensEmbeddableOutput$={lensEmbeddableOutput$}
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
