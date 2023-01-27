/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Subject } from 'rxjs';
import { UnifiedHistogramLayout, UnifiedHistogramLayoutProps } from '../layout';
import type { UnifiedHistogramInputMessage } from '../types';
import {
  UnifiedHistogramState,
  UnifiedHistogramStateOptions,
  UnifiedHistogramStateService,
} from './services/state_service';
import { useStateProps } from './hooks/use_state_props';

type LayoutProps = Pick<
  UnifiedHistogramLayoutProps,
  'services' | 'disableAutoFetching' | 'disableTriggers' | 'disabledActions'
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
export interface UnifiedHistogramInitializedApi {
  /**
   * Whether the container has been initialized
   */
  initialized: true;
  /**
   * Get an observable to watch the container state, optionally providing a
   * selector function which only gets triggered when the selected state changes
   */
  getState$: UnifiedHistogramStateService['getState$'];
  /**
   * Update the container state my providing a partial state object
   */
  updateState: UnifiedHistogramStateService['updateState'];
  /**
   * Manually trigger a refetch of the data
   */
  refetch: () => void;
}

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
  const [state, setState] = useState<UnifiedHistogramState>();
  const [stateService, setStateService] = useState<UnifiedHistogramStateService>();
  const stateProps = useStateProps({ state, stateService });
  const input$ = useMemo(() => new Subject<UnifiedHistogramInputMessage>(), []);

  useImperativeHandle(
    ref,
    () => ({
      initialized,
      initialize: (options: UnifiedHistogramInitializeOptions) => {
        const { services, disableAutoFetching, disableTriggers, disabledActions } = options;

        setLayoutProps({ services, disableAutoFetching, disableTriggers, disabledActions });
        setStateService(new UnifiedHistogramStateService(options));
        setInitialized(true);
      },
      getState$: (selector) => {
        return stateService!.getState$(selector);
      },
      updateState: (stateUpdate) => {
        stateService!.updateState(stateUpdate);
      },
      refetch: () => {
        input$.next({ type: 'refetch' });
      },
    }),
    [initialized, input$, stateService]
  );

  // Subscribe to state changes
  useEffect(() => {
    if (!stateService) {
      return;
    }

    const subscription = stateService.getState$().subscribe(setState);

    return () => {
      subscription.unsubscribe();
    };
  }, [stateService]);

  // Don't render anything until the container is initialized
  if (!layoutProps || !state) {
    return null;
  }

  return (
    <UnifiedHistogramLayout
      {...containerProps}
      {...layoutProps}
      {...stateProps}
      dataView={state.dataView}
      query={state.query}
      filters={state.filters}
      timeRange={state.timeRange}
      topPanelHeight={state.topPanelHeight}
      input$={input$}
    />
  );
});

// eslint-disable-next-line import/no-default-export
export default UnifiedHistogramContainer;
