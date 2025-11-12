/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/public';
import type {
  EmbeddableComponentProps,
  LensEmbeddableInput,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import { useEffect, useMemo, useState } from 'react';
import type { Observable } from 'rxjs';
import { of } from 'rxjs';
import useMount from 'react-use/lib/useMount';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { cloneDeep } from 'lodash';
import type { DataView } from '@kbn/data-views-plugin/common';
import useObservable from 'react-use/lib/useObservable';
import useLatest from 'react-use/lib/useLatest';
import type { ControlPanelsState } from '@kbn/control-group-renderer';
import type { UnifiedHistogramChartProps } from '../components/chart/chart';
import type {
  UnifiedHistogramExternalVisContextStatus,
  UnifiedHistogramRequestContext,
  UnifiedHistogramServices,
  UnifiedHistogramSuggestionContext,
  UnifiedHistogramVisContext,
} from '../types';
import { UnifiedHistogramSuggestionType } from '../types';
import type {
  UnifiedHistogramStateOptions,
  UnifiedHistogramStateService,
} from '../services/state_service';
import { LensVisService } from '../services/lens_vis_service';
import { checkChartAvailability } from '../components/chart';
import type { UnifiedHistogramLayoutProps } from '../components/layout/layout';
import { useServicesBootstrap } from './use_services_bootstrap';

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
   * The ES|QL variables to use for the chart
   */
  esqlVariables?: ESQLControlVariable[];
  /**
   * The controls state to use for the chart
   */
  controlsState?: ControlPanelsState;
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
   * The timestamp of the last data request
   */
  lastReloadRequestTime?: number;
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
  const [lensVisService, setLensVisService] = useState<LensVisService>();

  const { stateProps, requestParams, api, input$ } = useServicesBootstrap(props);

  // Load async services and initialize API
  useMount(async () => {
    const apiHelper = await services.lens.stateHelperApi();
    setLensVisService(new LensVisService({ services, lensSuggestionsApi: apiHelper.suggestions }));
  });

  const {
    services,
    dataView,
    columns,
    isChartLoading,
    timeRange,
    table,
    externalVisContext,
    controlsState,
  } = props;

  const columnsMap = useMemo(() => {
    return columns?.reduce<Record<string, DatatableColumn>>((acc, column) => {
      acc[column.id] = column;
      return acc;
    }, {});
  }, [columns]);

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
          controlsState,
          input$,
          chart,
          isChartAvailable,
          requestParams,
          lensVisService,
        }
      : undefined;
  }, [
    chart,
    input$,
    isChartAvailable,
    lensVisService,
    props,
    requestParams,
    stateProps,
    controlsState,
  ]);
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
