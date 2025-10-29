/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EmbeddableComponentProps,
  LensEmbeddableInput,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import { useEffect, useMemo, useState } from 'react';
import type { Observable } from 'rxjs';
import { of } from 'rxjs';
import useMount from 'react-use/lib/useMount';
import { cloneDeep } from 'lodash';
import useObservable from 'react-use/lib/useObservable';
import useLatest from 'react-use/lib/useLatest';
import type { UnifiedHistogramChartProps } from '../components/chart/chart';
import type {
  UnifiedHistogramExternalVisContextStatus,
  UnifiedHistogramServices,
  UnifiedHistogramSuggestionContext,
  UnifiedHistogramVisContext,
  UnifiedHistogramFetchParams,
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
  fetch: (params: UnifiedHistogramFetchParams) => void;
} & Pick<
  UnifiedHistogramStateService,
  'state$' | 'setChartHidden' | 'setTopPanelHeight' | 'setTimeInterval' | 'setTotalHits'
>;

export type UnifiedHistogramPartialLayoutProps = Omit<
  UnifiedHistogramLayoutProps,
  'container' | 'unifiedHistogramChart'
>;

export type UseUnifiedHistogramResult =
  | {
      isInitialized: false;
      api?: UnifiedHistogramApi;
      chartProps?: undefined;
      layoutProps?: undefined;
    }
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

  const { stateProps, requestParams, fetchParams, hasValidFetchParams, api, input$ } =
    useServicesBootstrap(props);

  // Load async services and initialize API
  useMount(async () => {
    const apiHelper = await services.lens.stateHelperApi();
    setLensVisService(new LensVisService({ services, lensSuggestionsApi: apiHelper.suggestions }));
  });

  const { services, isChartLoading } = props;

  const lensVisServiceCurrentSuggestionContext = useObservable(
    lensVisService?.currentSuggestionContext$ ?? EMPTY_SUGGESTION_CONTEXT
  );
  const latestGetModifiedVisAttributes = useLatest(props.getModifiedVisAttributes);

  useEffect(() => {
    if (isChartLoading || !lensVisService || !fetchParams?.dataView) {
      return;
    }

    lensVisService.update({
      externalVisContext: fetchParams.externalVisContext,
      queryParams: {
        dataView: fetchParams.dataView,
        query: requestParams.query,
        filters: requestParams.filters,
        timeRange: fetchParams.timeRange,
        isPlainRecord: stateProps.isPlainRecord,
        columns: fetchParams.columns,
        columnsMap: requestParams.columnsMap,
      },
      timeInterval: stateProps.chart?.timeInterval,
      breakdownField: stateProps.breakdown?.field,
      table: fetchParams.table,
      onSuggestionContextChange: stateProps.onSuggestionContextChange,
      onVisContextChanged: stateProps.onVisContextChanged,
      getModifiedVisAttributes: (attributes) => {
        return latestGetModifiedVisAttributes.current?.(cloneDeep(attributes)) ?? attributes;
      },
    });
  }, [
    fetchParams?.columns,
    fetchParams?.table,
    fetchParams?.timeRange,
    fetchParams?.dataView,
    fetchParams?.externalVisContext,
    isChartLoading,
    latestGetModifiedVisAttributes,
    lensVisService,
    requestParams.filters,
    requestParams.query,
    requestParams.columnsMap,
    stateProps.breakdown?.field,
    stateProps.chart?.timeInterval,
    stateProps.isPlainRecord,
    stateProps.onSuggestionContextChange,
    stateProps.onVisContextChanged,
  ]);

  const chart =
    !lensVisServiceCurrentSuggestionContext?.type ||
    lensVisServiceCurrentSuggestionContext.type === UnifiedHistogramSuggestionType.unsupported
      ? undefined
      : stateProps.chart;

  const isChartAvailable = checkChartAvailability({
    chart,
    dataView: fetchParams?.dataView,
    isPlainRecord: stateProps.isPlainRecord,
  });

  const chartProps = useMemo<UnifiedHistogramChartProps | undefined>(() => {
    return lensVisService && fetchParams?.dataView
      ? {
          ...props,
          ...stateProps,
          dataView: fetchParams.dataView,
          controlsState: fetchParams?.controlsState,
          columns: fetchParams?.columns,
          relativeTimeRange: fetchParams?.relativeTimeRange,
          abortController: fetchParams?.abortController,
          input$,
          chart,
          isChartAvailable,
          requestParams,
          lensVisService,
        }
      : undefined;
  }, [
    lensVisService,
    fetchParams?.dataView,
    fetchParams?.controlsState,
    fetchParams?.columns,
    fetchParams?.relativeTimeRange,
    fetchParams?.abortController,
    props,
    stateProps,
    input$,
    chart,
    isChartAvailable,
    requestParams,
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

  if (!api || !hasValidFetchParams || !chartProps) {
    return { isInitialized: false, api };
  }

  return {
    isInitialized: true,
    api,
    chartProps,
    layoutProps,
  };
};
