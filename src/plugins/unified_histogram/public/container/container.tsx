/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { Subject } from 'rxjs';
import { pick } from 'lodash';
import { LensSuggestionsApi } from '@kbn/lens-plugin/public';
import { UnifiedHistogramLayout, UnifiedHistogramLayoutProps } from '../layout';
import type { UnifiedHistogramInputMessage } from '../types';
import {
  createStateService,
  UnifiedHistogramStateOptions,
  UnifiedHistogramStateService,
} from './services/state_service';
import { useStateProps } from './hooks/use_state_props';
import { useStateSelector } from './utils/use_state_selector';
import {
  columnsSelector,
  currentSuggestionSelector,
  dataViewSelector,
  filtersSelector,
  querySelector,
  timeRangeSelector,
  topPanelHeightSelector,
} from './utils/state_selectors';

type LayoutProps = Pick<
  UnifiedHistogramLayoutProps,
  | 'services'
  | 'disableAutoFetching'
  | 'disableTriggers'
  | 'disabledActions'
  | 'getRelativeTimeRange'
>;

/**
 * The props exposed by the container
 */
export type UnifiedHistogramContainerProps = Pick<
  UnifiedHistogramLayoutProps,
  'className' | 'resizeRef' | 'appendHitsCounter' | 'children'
>;

/**
 * The options used to initialize the container
 */
export type UnifiedHistogramInitializeOptions = UnifiedHistogramStateOptions &
  Omit<LayoutProps, 'services'>;

/**
 * The uninitialized API exposed by the container
 */
export interface UnifiedHistogramUninitializedApi {
  /**
   * Whether the container has been initialized
   */
  initialized: false;
  /**
   * Initialize the container
   */
  initialize: (options: UnifiedHistogramInitializeOptions) => void;
}

/**
 * The initialized API exposed by the container
 */
export type UnifiedHistogramInitializedApi = {
  /**
   * Whether the container has been initialized
   */
  initialized: true;
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
  | 'setRequestParams'
  | 'setTotalHits'
>;

/**
 * The API exposed by the container
 */
export type UnifiedHistogramApi = UnifiedHistogramUninitializedApi | UnifiedHistogramInitializedApi;

export const UnifiedHistogramContainer = forwardRef<
  UnifiedHistogramApi,
  UnifiedHistogramContainerProps
>((containerProps, ref) => {
  const [initialized, setInitialized] = useState(false);
  const [layoutProps, setLayoutProps] = useState<LayoutProps>();
  const [stateService, setStateService] = useState<UnifiedHistogramStateService>();
  const [lensSuggestionsApi, setLensSuggestionsApi] = useState<LensSuggestionsApi>();
  const [input$] = useState(() => new Subject<UnifiedHistogramInputMessage>());
  const api = useMemo<UnifiedHistogramApi>(
    () => ({
      initialized,
      initialize: (options: UnifiedHistogramInitializeOptions) => {
        const {
          services,
          disableAutoFetching,
          disableTriggers,
          disabledActions,
          getRelativeTimeRange,
        } = options;

        // API helpers are loaded async from Lens
        (async () => {
          const apiHelper = await services.lens.stateHelperApi();
          setLensSuggestionsApi(() => apiHelper.suggestions);
        })();

        setLayoutProps({
          services,
          disableAutoFetching,
          disableTriggers,
          disabledActions,
          getRelativeTimeRange,
        });
        setStateService(createStateService(options));
        setInitialized(true);
      },
      refetch: () => {
        input$.next({ type: 'refetch' });
      },
      ...pick(
        stateService!,
        'state$',
        'setChartHidden',
        'setTopPanelHeight',
        'setBreakdownField',
        'setColumns',
        'setTimeInterval',
        'setRequestParams',
        'setTotalHits'
      ),
    }),
    [initialized, input$, stateService]
  );

  // Expose the API to the parent component
  useImperativeHandle(ref, () => api, [api]);

  const stateProps = useStateProps(stateService);
  const dataView = useStateSelector(stateService?.state$, dataViewSelector);
  const query = useStateSelector(stateService?.state$, querySelector);
  const filters = useStateSelector(stateService?.state$, filtersSelector);
  const timeRange = useStateSelector(stateService?.state$, timeRangeSelector);
  const columns = useStateSelector(stateService?.state$, columnsSelector);
  const currentSuggestion = useStateSelector(stateService?.state$, currentSuggestionSelector);
  const topPanelHeight = useStateSelector(stateService?.state$, topPanelHeightSelector);

  // Don't render anything until the container is initialized
  if (!layoutProps || !dataView || !lensSuggestionsApi) {
    return null;
  }

  return (
    <UnifiedHistogramLayout
      {...containerProps}
      {...layoutProps}
      {...stateProps}
      dataView={dataView}
      query={query}
      filters={filters}
      timeRange={timeRange}
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
