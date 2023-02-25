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
import { UnifiedHistogramLayout, UnifiedHistogramLayoutProps } from '../layout';
import type { UnifiedHistogramInputMessage, UnifiedHistogramRequestContext } from '../types';
import {
  createStateService,
  UnifiedHistogramStateOptions,
  UnifiedHistogramStateService,
} from './services/state_service';
import { useStateProps } from './hooks/use_state_props';
import { useStateSelector } from './utils/use_state_selector';
import {
  topPanelHeightSelector,
  columnsSelector,
  currentSuggestionSelector,
} from './utils/state_selectors';

type LayoutProps = Pick<
  UnifiedHistogramLayoutProps,
  'disableAutoFetching' | 'disableTriggers' | 'disabledActions' | 'getRelativeTimeRange'
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
} & Pick<
  UnifiedHistogramLayoutProps,
  | 'services'
  | 'className'
  | 'dataView'
  | 'query'
  | 'filters'
  | 'timeRange'
  | 'resizeRef'
  | 'appendHitsCounter'
  | 'children'
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
  | 'setColumns'
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
    const options = await containerProps.getCreationOptions!();
    const { disableAutoFetching, disableTriggers, disabledActions, getRelativeTimeRange } = options;

    // API helpers are loaded async from Lens
    const apiHelper = await containerProps.services.lens.stateHelperApi();
    setLensSuggestionsApi(() => apiHelper.suggestions);

    setLayoutProps({
      disableAutoFetching,
      disableTriggers,
      disabledActions,
      getRelativeTimeRange,
    });

    setStateService(
      createStateService({
        services: containerProps.services,
        ...options,
      })
    );
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
        'setColumns',
        'setTimeInterval',
        'setTotalHits'
      ),
    });
  }, [input$, stateService]);

  const columns = useStateSelector(stateService?.state$, columnsSelector);
  const currentSuggestion = useStateSelector(stateService?.state$, currentSuggestionSelector);
  const { dataView, query, searchSessionId, requestAdapter } = containerProps;
  const topPanelHeight = useStateSelector(stateService?.state$, topPanelHeightSelector);
  const stateProps = useStateProps({
    stateService,
    dataView,
    query,
    searchSessionId,
    requestAdapter,
  });

  // Don't render anything until the container is initialized
  if (!layoutProps || !api || !lensSuggestionsApi) {
    return null;
  }

  return (
    <UnifiedHistogramLayout
      {...containerProps}
      {...layoutProps}
      {...stateProps}
      columns={columns}
      currentSuggestion={currentSuggestion}
      topPanelHeight={topPanelHeight}
      input$={input$}
      lensSuggestionsApi={lensSuggestionsApi}
    />
  );
});

// eslint-disable-next-line import/no-default-export
export default UnifiedHistogramContainer;
