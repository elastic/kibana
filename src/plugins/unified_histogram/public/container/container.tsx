/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Subject } from 'rxjs';
import { pick } from 'lodash';
import useMount from 'react-use/lib/useMount';
import { LensSuggestionsApi } from '@kbn/lens-plugin/public';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { UnifiedHistogramLayout, UnifiedHistogramLayoutProps } from '../layout';
import type { UnifiedHistogramInputMessage, UnifiedHistogramRequestContext } from '../types';
import {
  createStateService,
  UnifiedHistogramStateOptions,
  UnifiedHistogramStateService,
} from './services/state_service';
import { useStateProps } from './hooks/use_state_props';
import { useStateSelector } from './utils/use_state_selector';
import { topPanelHeightSelector, currentSuggestionSelector } from './utils/state_selectors';

type LayoutProps = Pick<
  UnifiedHistogramLayoutProps,
  'disableAutoFetching' | 'disableTriggers' | 'disabledActions'
>;

/**
 * The options used to initialize the container
 */
export type UnifiedHistogramCreationOptions = Omit<UnifiedHistogramStateOptions, 'services'> &
  LayoutProps;

/**
 * The props exposed by the container
 */
export type UnifiedHistogramContainerProps = {
  getCreationOptions?: () =>
    | UnifiedHistogramCreationOptions
    | Promise<UnifiedHistogramCreationOptions>;
  searchSessionId?: UnifiedHistogramRequestContext['searchSessionId'];
  requestAdapter?: UnifiedHistogramRequestContext['adapter'];
  isChartLoading?: boolean;
  table?: Datatable;
} & Pick<
  UnifiedHistogramLayoutProps,
  | 'services'
  | 'className'
  | 'dataView'
  | 'query'
  | 'filters'
  | 'timeRange'
  | 'relativeTimeRange'
  | 'columns'
  | 'container'
  | 'renderCustomChartToggleActions'
  | 'children'
  | 'onBrushEnd'
  | 'onFilter'
  | 'withDefaultActions'
  | 'disabledActions'
  | 'abortController'
>;

/**
 * The API exposed by the container
 */
export type UnifiedHistogramApi = {
  /**
   * Manually trigger a refetch of the data
   */
  refetch: () => void;
} & Pick<
  UnifiedHistogramStateService,
  | 'state$'
  | 'setChartHidden'
  | 'setTopPanelHeight'
  | 'setBreakdownField'
  | 'setTimeInterval'
  | 'setTotalHits'
>;

export const UnifiedHistogramContainer = forwardRef<
  UnifiedHistogramApi,
  UnifiedHistogramContainerProps
>((containerProps, ref) => {
  const [layoutProps, setLayoutProps] = useState<LayoutProps>();
  const [stateService, setStateService] = useState<UnifiedHistogramStateService>();
  const [lensSuggestionsApi, setLensSuggestionsApi] = useState<LensSuggestionsApi>();
  const [input$] = useState(() => new Subject<UnifiedHistogramInputMessage>());
  const [api, setApi] = useState<UnifiedHistogramApi>();

  // Expose the API to the parent component
  useImperativeHandle(ref, () => api!, [api]);

  // Call for creation options once the container is mounted
  useMount(async () => {
    const { getCreationOptions, services } = containerProps;
    const options = await getCreationOptions?.();
    const apiHelper = await services.lens.stateHelperApi();

    setLayoutProps(pick(options, 'disableAutoFetching', 'disableTriggers', 'disabledActions'));
    setStateService(createStateService({ services, ...options }));
    setLensSuggestionsApi(() => apiHelper.suggestions);
  });

  // Initialize the API once the state service is available
  useEffect(() => {
    if (!stateService) {
      return;
    }

    setApi({
      refetch: () => {
        input$.next({ type: 'refetch' });
      },
      ...pick(
        stateService,
        'state$',
        'setChartHidden',
        'setTopPanelHeight',
        'setBreakdownField',
        'setTimeInterval',
        'setTotalHits'
      ),
    });
  }, [input$, stateService]);
  const { dataView, query, searchSessionId, requestAdapter, isChartLoading } = containerProps;
  const currentSuggestion = useStateSelector(stateService?.state$, currentSuggestionSelector);
  const topPanelHeight = useStateSelector(stateService?.state$, topPanelHeightSelector);
  const stateProps = useStateProps({
    stateService,
    dataView,
    query,
    searchSessionId,
    requestAdapter,
  });

  // Don't render anything until the container is initialized
  if (!layoutProps || !lensSuggestionsApi || !api) {
    return null;
  }

  return (
    <UnifiedHistogramLayout
      {...containerProps}
      {...layoutProps}
      {...stateProps}
      currentSuggestion={currentSuggestion}
      isChartLoading={Boolean(isChartLoading)}
      topPanelHeight={topPanelHeight}
      input$={input$}
      lensSuggestionsApi={lensSuggestionsApi}
    />
  );
});

// eslint-disable-next-line import/no-default-export
export default UnifiedHistogramContainer;
