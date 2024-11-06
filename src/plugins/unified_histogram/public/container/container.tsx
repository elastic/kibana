/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Subject } from 'rxjs';
import { pick } from 'lodash';
import useMount from 'react-use/lib/useMount';
import { LensSuggestionsApi } from '@kbn/lens-plugin/public';
import { UnifiedHistogramLayout, UnifiedHistogramLayoutProps } from '../layout';
import {
  UnifiedHistogramExternalVisContextStatus,
  UnifiedHistogramInputMessage,
  UnifiedHistogramRequestContext,
  UnifiedHistogramVisContext,
} from '../types';
import {
  createStateService,
  UnifiedHistogramStateOptions,
  UnifiedHistogramStateService,
} from './services/state_service';
import { useStateProps } from './hooks/use_state_props';
import { useStateSelector } from './utils/use_state_selector';
import { topPanelHeightSelector } from './utils/state_selectors';
import { exportVisContext } from '../utils/external_vis_context';

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
  onVisContextChanged?: (
    nextVisContext: UnifiedHistogramVisContext | undefined,
    externalVisContextStatus: UnifiedHistogramExternalVisContextStatus
  ) => void;
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
  | 'table'
  | 'container'
  | 'renderCustomChartToggleActions'
  | 'children'
  | 'onBrushEnd'
  | 'onFilter'
  | 'externalVisContext'
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
>(({ onVisContextChanged, ...containerProps }, ref) => {
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
  const topPanelHeight = useStateSelector(stateService?.state$, topPanelHeightSelector);
  const stateProps = useStateProps({
    stateService,
    dataView,
    query,
    searchSessionId,
    requestAdapter,
    columns: containerProps.columns,
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
  if (!layoutProps || !lensSuggestionsApi || !api) {
    return null;
  }

  return (
    <UnifiedHistogramLayout
      {...containerProps}
      {...layoutProps}
      {...stateProps}
      onVisContextChanged={handleVisContextChange}
      isChartLoading={Boolean(isChartLoading)}
      topPanelHeight={topPanelHeight}
      input$={input$}
      lensSuggestionsApi={lensSuggestionsApi}
    />
  );
});

// eslint-disable-next-line import/no-default-export
export default UnifiedHistogramContainer;
