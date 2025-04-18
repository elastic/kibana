/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  ReactElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { Subject } from 'rxjs';
import { pick } from 'lodash';
import useMount from 'react-use/lib/useMount';
import {
  EmbeddableComponentProps,
  LensEmbeddableInput,
  LensEmbeddableOutput,
  LensPublicStart,
  LensSuggestionsApi,
} from '@kbn/lens-plugin/public';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { Datatable, DatatableColumn } from '@kbn/expressions-plugin/public';
import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { UnifiedHistogramLayoutProps } from '../layout';
import {
  UnifiedHistogramBreakdownContext,
  UnifiedHistogramChartContext,
  UnifiedHistogramChartLoadEvent,
  UnifiedHistogramExternalVisContextStatus,
  UnifiedHistogramFetchStatus,
  UnifiedHistogramHitsContext,
  UnifiedHistogramInput$,
  UnifiedHistogramInputMessage,
  UnifiedHistogramRequestContext,
  UnifiedHistogramServices,
  UnifiedHistogramSuggestionContext,
  UnifiedHistogramSuggestionType,
  UnifiedHistogramVisContext,
} from '../types';
import {
  createStateService,
  UnifiedHistogramStateOptions,
  UnifiedHistogramStateService,
} from './services/state_service';
import { useStateProps } from './hooks/use_state_props';
import { exportVisContext } from '../utils/external_vis_context';
import { getBreakdownField } from './utils/local_storage_utils';
import { useRequestParams } from '../hooks/use_request_params';
import { LensVisService } from '../services/lens_vis_service';
import { Chart, checkChartAvailability } from '../chart';

/**
 * The props exposed by the container
 */
export type UnifiedHistogramContainerProps2 = Omit<UnifiedHistogramStateOptions, 'services'> & {
  searchSessionId?: UnifiedHistogramRequestContext['searchSessionId'];
  requestAdapter?: UnifiedHistogramRequestContext['adapter'];
  isChartLoading?: boolean;
  breakdownField?: string;
  onBreakdownFieldChange?: (breakdownField: string | undefined) => void;
  onVisContextChanged?: (
    nextVisContext: UnifiedHistogramVisContext | undefined,
    externalVisContextStatus: UnifiedHistogramExternalVisContextStatus
  ) => void;
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
  dataLoading$?: LensEmbeddableOutput['dataLoading$'];
  /**
   * Context object for the chart -- leave undefined to hide the chart
   */
  chart?: UnifiedHistogramChartContext;
  /**
   * Context object for the breakdown -- leave undefined to hide the breakdown
   */
  breakdown?: UnifiedHistogramBreakdownContext;
  /**
   * This element would replace the default chart toggle buttons
   */
  renderCustomChartToggleActions?: () => ReactElement | undefined;
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
   * Callback to hide or show the chart -- should set {@link UnifiedHistogramChartContext.hidden} to chartHidden
   */
  onChartHiddenChange?: (chartHidden: boolean) => void;
  /**
   * Callback to update the time interval -- should set {@link UnifiedHistogramChartContext.timeInterval} to timeInterval
   */
  onTimeIntervalChange?: (timeInterval: string) => void;
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
  LensEmbeddableOverride?: LensPublicStart['EmbeddableComponent'];
};

/**
 * The API exposed by the container
 */
export type UnifiedHistogramApi2 = {
  /**
   * Trigger a fetch of the data
   */
  fetch: () => void;
} & Pick<
  UnifiedHistogramStateService,
  'state$' | 'setChartHidden' | 'setTopPanelHeight' | 'setTimeInterval' | 'setTotalHits'
>;

export const UnifiedHistogramContainer2 = forwardRef<
  UnifiedHistogramApi2,
  UnifiedHistogramContainerProps2
>(({ onBreakdownFieldChange, onVisContextChanged, ...containerProps }, ref) => {
  const [stateService] = useState(() => {
    const { services, initialState, localStorageKeyPrefix } = containerProps;
    return createStateService({ services, initialState, localStorageKeyPrefix });
  });
  const [lensSuggestionsApi, setLensSuggestionsApi] = useState<LensSuggestionsApi>();
  const [input$] = useState(() => new Subject<UnifiedHistogramInputMessage>());
  const [api, setApi] = useState<UnifiedHistogramApi2>();

  // Expose the API to the parent component
  useImperativeHandle(ref, () => api!, [api]);

  // Load async services and initialize API
  useMount(async () => {
    const apiHelper = await services.lens.stateHelperApi();
    setLensSuggestionsApi(() => apiHelper.suggestions);
    setApi({
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

  const {
    services,
    dataView,
    query,
    columns,
    searchSessionId,
    requestAdapter,
    isChartLoading,
    localStorageKeyPrefix,
  } = containerProps;
  const initialBreakdownField = useMemo(
    () =>
      localStorageKeyPrefix
        ? getBreakdownField(services.storage, localStorageKeyPrefix)
        : undefined,
    [localStorageKeyPrefix, services.storage]
  );
  const stateProps = useStateProps({
    services,
    localStorageKeyPrefix,
    stateService,
    dataView,
    query,
    searchSessionId,
    requestAdapter,
    columns,
    breakdownField: initialBreakdownField,
    ...pick(containerProps, 'breakdownField'),
    onBreakdownFieldChange,
  });

  const handleVisContextChange: UnifiedHistogramLayoutProps['onVisContextChanged'] | undefined =
    useMemo(() => {
      if (!onVisContextChanged) {
        return undefined;
      }

      return (visContext, externalVisContextStatus) => {
        const minifiedVisContext = exportVisContext(visContext);

        onVisContextChanged(minifiedVisContext, externalVisContextStatus);
      };
    }, [onVisContextChanged]);

  // Don't render anything until the container is initialized
  if (!lensSuggestionsApi || !api) {
    return null;
  }

  return (
    <ChartWrapper
      {...containerProps}
      {...stateProps}
      onVisContextChanged={handleVisContextChange}
      isChartLoading={Boolean(isChartLoading)}
      input$={input$}
      lensSuggestionsApi={lensSuggestionsApi}
    />
  );
});

const ChartMemoized = React.memo(Chart);

const ChartWrapper = (
  props: Omit<UnifiedHistogramContainerProps2, 'onBreakdownFieldChange'> & {
    /**
     * Flag indicating that the chart is currently loading
     */
    isChartLoading: boolean;
    /**
     * The Lens suggestions API
     */
    lensSuggestionsApi: LensSuggestionsApi;
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
  }
) => {
  const {
    services,
    dataView,
    isPlainRecord,
    columns,
    query,
    filters,
    timeRange,
    isChartLoading,
    chart: originalChart,
    breakdown,
    table,
    externalVisContext,
    lensSuggestionsApi,
    onSuggestionContextChange,
    onVisContextChanged,
  } = props;
  const columnsMap = useMemo(() => {
    return columns?.reduce<Record<string, DatatableColumn>>((acc, column) => {
      acc[column.id] = column;
      return acc;
    }, {});
  }, [columns]);
  const requestParams = useRequestParams({
    services,
    query,
    filters,
    timeRange,
  });
  const [lensVisService] = useState(() => new LensVisService({ services, lensSuggestionsApi }));
  const lensVisServiceCurrentSuggestionContext = useObservable(
    lensVisService.currentSuggestionContext$
  );

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
        timeRange,
        isPlainRecord,
        columns,
        columnsMap,
      },
      timeInterval: originalChart?.timeInterval,
      breakdownField: breakdown?.field,
      table,
      onSuggestionContextChange,
      onVisContextChanged: isPlainRecord ? onVisContextChanged : undefined,
    });
  }, [
    breakdown?.field,
    columns,
    columnsMap,
    dataView,
    externalVisContext,
    isChartLoading,
    isPlainRecord,
    lensVisService,
    onSuggestionContextChange,
    onVisContextChanged,
    originalChart?.timeInterval,
    requestParams.filters,
    requestParams.query,
    table,
    timeRange,
  ]);

  const chart =
    !lensVisServiceCurrentSuggestionContext?.type ||
    lensVisServiceCurrentSuggestionContext.type === UnifiedHistogramSuggestionType.unsupported
      ? undefined
      : originalChart;
  const isChartAvailable = checkChartAvailability({ chart, dataView, isPlainRecord });

  return (
    <ChartMemoized
      isChartAvailable={isChartAvailable}
      //   className={chartClassName}
      requestParams={requestParams}
      lensVisService={lensVisService}
      chart={chart}
      {...props}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export default UnifiedHistogramContainer2;
