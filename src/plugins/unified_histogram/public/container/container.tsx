/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, {
  ForwardedRef,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
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

export type UnifiedHistogramContainerProps = Pick<
  UnifiedHistogramLayoutProps,
  'className' | 'resizeRef' | 'appendHitsCounter' | 'children'
>;

export interface UnifiedHistogramInitializeOptions
  extends UnifiedHistogramStateOptions,
    LayoutProps {
  localStorageKeyPrefix?: string;
}

export interface UnifiedHistogramApi {
  initialized: boolean;
  initialize: (options: UnifiedHistogramInitializeOptions) => void;
  getState$: UnifiedHistogramStateService['getState$'];
  updateState: UnifiedHistogramStateService['updateState'];
  refetch: () => void;
}

export const UnifiedHistogramContainer = forwardRef(
  (containerProps: UnifiedHistogramContainerProps, ref: ForwardedRef<UnifiedHistogramApi>) => {
    const [initialized, setInitialized] = useState(false);
    const [layoutProps, setLayoutProps] = useState<LayoutProps>();
    const [state, setState] = useState<UnifiedHistogramState>();
    const [stateService, setStateService] = useState<UnifiedHistogramStateService>();
    const input$ = useMemo(() => new Subject<UnifiedHistogramInputMessage>(), []);

    useEffect(() => {
      if (!stateService) {
        return;
      }

      const subscription = stateService.getState$().subscribe(setState);

      return () => {
        subscription.unsubscribe();
      };
    }, [stateService]);

    useImperativeHandle(
      ref,
      () => ({
        initialized,
        initialize: (options: UnifiedHistogramInitializeOptions) => {
          if (initialized) {
            throw Error('Unified Histogram can only be initialized once.');
          }

          const { services, disableAutoFetching, disableTriggers, disabledActions } = options;

          setLayoutProps({ services, disableAutoFetching, disableTriggers, disabledActions });
          setStateService(new UnifiedHistogramStateService(options));
          setInitialized(true);
        },
        getState$: () => {
          if (!stateService) {
            throw Error('Unified Histogram must be initialized before calling getState$.');
          }

          return stateService.getState$();
        },
        updateState: (stateUpdate) => {
          if (!stateService) {
            throw Error('Unified Histogram must be initialized before calling updateState.');
          }

          stateService.updateState(stateUpdate);
        },
        refetch: () => {
          if (!initialized) {
            throw Error('Unified Histogram must be initialized before calling refetch.');
          }

          input$.next({ type: 'refetch' });
        },
      }),
      [initialized, input$, stateService]
    );

    const stateProps = useStateProps({ state, stateService });

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
  }
);
