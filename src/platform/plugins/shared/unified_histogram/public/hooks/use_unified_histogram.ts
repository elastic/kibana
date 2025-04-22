/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { Datatable, DatatableColumn } from '@kbn/expressions-plugin/public';
import { EmbeddableComponentProps, LensEmbeddableInput } from '@kbn/lens-plugin/public';
import { useEffect, useMemo, useState } from 'react';
import { Observable, Subject, of } from 'rxjs';
import useMount from 'react-use/lib/useMount';
import { pick } from 'lodash';
import { DataView } from '@kbn/data-views-plugin/common';
import useObservable from 'react-use/lib/useObservable';
import { ChartProps } from '../chart/chart';
import { UnifiedHistogramStateOptions, getBreakdownField } from '../container';
import {
  UnifiedHistogramExternalVisContextStatus,
  UnifiedHistogramInputMessage,
  UnifiedHistogramRequestContext,
  UnifiedHistogramServices,
  UnifiedHistogramSuggestionContext,
  UnifiedHistogramSuggestionType,
  UnifiedHistogramVisContext,
} from '../types';
import {
  UnifiedHistogramStateService,
  createStateService,
} from '../container/services/state_service';
import { useStateProps } from '../container/hooks/use_state_props';
import { useRequestParams } from './use_request_params';
import { LensVisService } from '../services/lens_vis_service';
import { checkChartAvailability } from '../chart';
import { UnifiedHistogramLayoutProps } from '../layout/layout';

export type UseUnifiedHistogramProps = Omit<UnifiedHistogramStateOptions, 'services'> & {
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
   * Disabled action IDs for the Lens embeddable
   */
  disabledActions?: LensEmbeddableInput['disabledActions'];
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
};

export type UnifiedHistogramApi = {
  /**
   * Trigger a fetch of the data
   */
  fetch: () => void;
} & Pick<
  UnifiedHistogramStateService,
  'state$' | 'setChartHidden' | 'setTopPanelHeight' | 'setTimeInterval' | 'setTotalHits'
>;

export type UseUnifiedHistogramResult =
  | { isInitialized: false; api?: undefined; chartProps?: undefined; layoutProps?: undefined }
  | {
      isInitialized: true;
      api: UnifiedHistogramApi;
      chartProps: ChartProps;
      layoutProps: Omit<UnifiedHistogramLayoutProps, 'container' | 'chartPanel'>;
    };

const EMPTY_SUGGESTION_CONTEXT: Observable<UnifiedHistogramSuggestionContext> = of({
  suggestion: undefined,
  type: UnifiedHistogramSuggestionType.unsupported,
});

export const useUnifiedHistogram = (props: UseUnifiedHistogramProps): UseUnifiedHistogramResult => {
  const [stateService] = useState(() => {
    const { services, initialState, localStorageKeyPrefix } = props;
    return createStateService({ services, initialState, localStorageKeyPrefix });
  });
  const [lensVisService, setLensVisService] = useState<LensVisService>();
  const [input$] = useState(() => new Subject<UnifiedHistogramInputMessage>());
  const [api, setApi] = useState<UnifiedHistogramApi>();

  // Load async services and initialize API
  useMount(async () => {
    const apiHelper = await services.lens.stateHelperApi();
    setLensVisService(new LensVisService({ services, lensSuggestionsApi: apiHelper.suggestions }));
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
    filters,
    timeRange,
    table,
    externalVisContext,
  } = props;
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
    breakdownField: 'breakdownField' in props ? props.breakdownField : initialBreakdownField,
    onBreakdownFieldChange: props.onBreakdownFieldChange,
    onVisContextChanged: props.onVisContextChanged,
  });
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
  const lensVisServiceCurrentSuggestionContext = useObservable(
    lensVisService?.currentSuggestionContext$ ?? EMPTY_SUGGESTION_CONTEXT
  );

  useEffect(() => {
    if (isChartLoading || !lensVisService) {
      return;
    }

    lensVisService.update({
      externalVisContext,
      queryParams: {
        dataView,
        query: requestParams.query,
        filters: requestParams.filters,
        timeRange,
        isPlainRecord: stateProps.isPlainRecord,
        columns,
        columnsMap,
      },
      timeInterval: stateProps.chart?.timeInterval,
      breakdownField: stateProps.breakdown?.field,
      table,
      onSuggestionContextChange: stateProps.onSuggestionContextChange,
      onVisContextChanged: stateProps.isPlainRecord ? stateProps.onVisContextChanged : undefined,
    });
  }, [
    columns,
    columnsMap,
    dataView,
    externalVisContext,
    isChartLoading,
    lensVisService,
    requestParams.filters,
    requestParams.query,
    stateProps.breakdown?.field,
    stateProps.chart?.timeInterval,
    stateProps.isPlainRecord,
    stateProps.onSuggestionContextChange,
    stateProps.onVisContextChanged,
    table,
    timeRange,
  ]);

  const chart =
    !lensVisServiceCurrentSuggestionContext?.type ||
    lensVisServiceCurrentSuggestionContext.type === UnifiedHistogramSuggestionType.unsupported
      ? undefined
      : stateProps.chart;
  const isChartAvailable = checkChartAvailability({
    chart,
    dataView,
    isPlainRecord: stateProps.isPlainRecord,
  });
  const chartProps = useMemo<ChartProps | undefined>(() => {
    return lensVisService
      ? {
          ...props,
          ...stateProps,
          input$,
          chart,
          isChartAvailable,
          requestParams,
          lensVisService,
        }
      : undefined;
  }, [chart, input$, isChartAvailable, lensVisService, props, requestParams, stateProps]);
  const layoutProps = useMemo<Omit<UnifiedHistogramLayoutProps, 'container' | 'chartPanel'>>(
    () => ({
      chart,
      isChartAvailable,
      hits: stateProps.hits,
      topPanelHeight: stateProps.topPanelHeight,
      onTopPanelHeightChange: stateProps.onTopPanelHeightChange,
    }),
    [
      chart,
      isChartAvailable,
      stateProps.hits,
      stateProps.onTopPanelHeightChange,
      stateProps.topPanelHeight,
    ]
  );

  if (!api || !chartProps) {
    return { isInitialized: false };
  }

  return {
    isInitialized: true,
    api,
    chartProps,
    layoutProps,
  };
};
