/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/public';
import type {
  EmbeddableComponentProps,
  LensEmbeddableInput,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import { useEffect, useMemo, useState } from 'react';
import { Observable, Subject, of } from 'rxjs';
import useMount from 'react-use/lib/useMount';
import { cloneDeep, pick } from 'lodash';
import type { DataView } from '@kbn/data-views-plugin/common';
import useObservable from 'react-use/lib/useObservable';
import useLatest from 'react-use/lib/useLatest';
import { UnifiedHistogramChartProps } from '../components/chart/chart';
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
  UnifiedHistogramStateOptions,
  UnifiedHistogramStateService,
  createStateService,
} from '../services/state_service';
import { useStateProps } from './use_state_props';
import { useRequestParams } from './use_request_params';
import { LensVisService } from '../services/lens_vis_service';
import { checkChartAvailability } from '../components/chart';
import { UnifiedHistogramLayoutProps } from '../components/layout/layout';
import { getBreakdownField } from '../utils/local_storage_utils';

export type UseUnifiedHistogramProps = Omit<UnifiedHistogramStateOptions, 'services'> & {
  /**
   * Required services
   */
  services: UnifiedHistogramServices;
  /**
   * The current search session ID
   */
  searchSessionId?: UnifiedHistogramRequestContext['searchSessionId'];
  /**
   * The request adapter to use for the inspector
   */
  requestAdapter?: UnifiedHistogramRequestContext['adapter'];
  /**
   * The abort controller to use for requests
   */
  abortController?: AbortController;
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
   * The current breakdown field
   */
  breakdownField?: string;
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
   * Preloaded data table sometimes used for rendering the chart in ES|QL mode
   */
  table?: Datatable;
  /**
   * Flag indicating that the chart is currently loading
   */
  isChartLoading?: boolean;
  /**
   * Allows users to enable/disable default actions
   */
  withDefaultActions?: EmbeddableComponentProps['withDefaultActions'];
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
   * Callback to update the breakdown field -- should set {@link UnifiedHistogramBreakdownContext.field} to breakdownField
   */
  onBreakdownFieldChange?: (breakdownField: string | undefined) => void;
  /**
   * Callback to notify about the change in Lens attributes
   */
  onVisContextChanged?: (
    nextVisContext: UnifiedHistogramVisContext | undefined,
    externalVisContextStatus: UnifiedHistogramExternalVisContextStatus
  ) => void;
  /**
   * Callback to modify the default Lens vis attributes used in the chart
   */
  getModifiedVisAttributes?: (
    attributes: TypedLensByValueInput['attributes']
  ) => TypedLensByValueInput['attributes'];
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

export type UnifiedHistogramPartialLayoutProps = Omit<
  UnifiedHistogramLayoutProps,
  'container' | 'unifiedHistogramChart'
>;

export type UseUnifiedHistogramResult =
  | { isInitialized: false; api?: undefined; chartProps?: undefined; layoutProps?: undefined }
  | {
      isInitialized: true;
      api: UnifiedHistogramApi;
      chartProps: UnifiedHistogramChartProps;
      layoutProps: UnifiedHistogramPartialLayoutProps;
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
  const latestGetModifiedVisAttributes = useLatest(props.getModifiedVisAttributes);

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
      onVisContextChanged: stateProps.onVisContextChanged,
      getModifiedVisAttributes: (attributes) => {
        return latestGetModifiedVisAttributes.current?.(cloneDeep(attributes)) ?? attributes;
      },
    });
  }, [
    columns,
    columnsMap,
    dataView,
    externalVisContext,
    isChartLoading,
    latestGetModifiedVisAttributes,
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
  const chartProps = useMemo<UnifiedHistogramChartProps | undefined>(() => {
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
  const layoutProps = useMemo<UnifiedHistogramPartialLayoutProps>(
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
