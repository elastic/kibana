/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
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
import { topPanelHeightSelector } from './utils/state_selectors';
import { toExternalVisContextJSONString } from '../utils/external_vis_context';
import { removeTablesFromLensAttributes } from '../utils/lens_vis_from_table';

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
  onVisContextJSONChanged?: (nextVisContextJSON: string | undefined) => void;
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
  | 'externalVisContextJSON'
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
>(({ onVisContextJSONChanged, ...containerProps }, ref) => {
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
  });

  const handleVisContextChange: UnifiedHistogramLayoutProps['onVisContextChanged'] | undefined =
    useMemo(() => {
      if (!onVisContextJSONChanged) {
        return undefined;
      }

      return (visContext) => {
        // console.log('updating vis context', visContext);
        const lightweightVisContext = visContext
          ? {
              ...visContext,
              attributes: removeTablesFromLensAttributes(visContext?.attributes),
            }
          : undefined;
        onVisContextJSONChanged(toExternalVisContextJSONString(lightweightVisContext));
      };
    }, [onVisContextJSONChanged]);

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
