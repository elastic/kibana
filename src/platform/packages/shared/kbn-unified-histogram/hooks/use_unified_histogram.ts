/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddableComponentProps, LensEmbeddableInput } from '@kbn/lens-plugin/public';
import { useMemo } from 'react';
import type { UnifiedHistogramChartProps } from '../components/chart/chart';
import type {
  UnifiedHistogramExternalVisContextStatus,
  UnifiedHistogramServices,
  UnifiedHistogramVisContext,
  UnifiedHistogramFetchParamsExternal,
} from '../types';
import { UnifiedHistogramSuggestionType } from '../types';
import type {
  UnifiedHistogramStateOptions,
  UnifiedHistogramStateService,
} from '../services/state_service';
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
   * Callback to update the time interval for the histogram chart
   */
  onTimeIntervalChange?: (timeInterval: string | undefined) => void;
  /**
   * Callback to notify about the change in Lens attributes
   */
  onVisContextChanged?: (
    nextVisContext: UnifiedHistogramVisContext | undefined,
    externalVisContextStatus: UnifiedHistogramExternalVisContextStatus
  ) => void;
};

export type UnifiedHistogramApi = {
  /**
   * Trigger a fetch of the data
   */
  fetch: (params: UnifiedHistogramFetchParamsExternal) => void;
} & Pick<
  UnifiedHistogramStateService,
  'state$' | 'setChartHidden' | 'setTopPanelHeight' | 'setTotalHits'
>;

export type UnifiedHistogramPartialLayoutProps = Omit<
  UnifiedHistogramLayoutProps,
  'container' | 'unifiedHistogramChart'
>;

export type UseUnifiedHistogramResult =
  | {
      isInitialized: false;
      api: UnifiedHistogramApi;
      chartProps?: undefined;
      layoutProps?: undefined;
    }
  | {
      isInitialized: true;
      api: UnifiedHistogramApi;
      chartProps: UnifiedHistogramChartProps;
      layoutProps: UnifiedHistogramPartialLayoutProps;
    };

export const useUnifiedHistogram = (props: UseUnifiedHistogramProps): UseUnifiedHistogramResult => {
  const {
    stateProps,
    fetch$,
    fetchParams,
    hasValidFetchParams,
    api,
    lensVisService,
    lensVisServiceState,
  } = useServicesBootstrap(props, { enableLensVisService: true });

  const lensVisServiceCurrentSuggestionContextType =
    lensVisServiceState?.currentSuggestionContext?.type;

  const chart =
    !lensVisServiceCurrentSuggestionContextType ||
    lensVisServiceCurrentSuggestionContextType === UnifiedHistogramSuggestionType.unsupported
      ? undefined
      : stateProps.chart;

  const isChartAvailable = checkChartAvailability({
    chart,
    dataView: fetchParams?.dataView,
    isPlainRecord: fetchParams?.isESQLQuery,
  });

  const chartProps = useMemo<UnifiedHistogramChartProps | undefined>(() => {
    return lensVisService && lensVisServiceState && fetchParams?.dataView
      ? {
          ...props,
          ...stateProps,
          fetch$,
          fetchParams,
          chart,
          isChartAvailable,
          lensVisService,
          lensVisServiceState,
        }
      : undefined;
  }, [
    fetch$,
    fetchParams,
    lensVisService,
    lensVisServiceState,
    props,
    stateProps,
    chart,
    isChartAvailable,
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
