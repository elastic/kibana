/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HasSerializedChildState, SerializedPanelState } from '@kbn/presentation-containers';
import { PresentationPanel, PresentationPanelProps } from '@kbn/presentation-panel-plugin/public';
import {
  apiPublishesDataLoading,
  ComparatorDefinition,
  PhaseEvent,
  StateComparators,
} from '@kbn/presentation-publishing';
import React, { useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { BehaviorSubject, combineLatest, debounceTime, skip, Subscription, switchMap } from 'rxjs';
import { v4 as generateId } from 'uuid';
import { getReactEmbeddableFactory } from './react_embeddable_registry';
import { initializeReactEmbeddableState } from './react_embeddable_state';
import {
  DefaultEmbeddableApi,
  SetReactEmbeddableApiRegistration,
  BuildReactEmbeddableApiRegistration,
} from './types';

const ON_STATE_CHANGE_DEBOUNCE = 100;

/**
 * Renders a component from the React Embeddable registry into a Presentation Panel.
 *
 * TODO: Rename this to simply `Embeddable` when the legacy Embeddable system is removed.
 */
export const ReactEmbeddableRenderer = <
  SerializedState extends object = object,
  Api extends DefaultEmbeddableApi<SerializedState> = DefaultEmbeddableApi<SerializedState>,
  RuntimeState extends object = SerializedState,
  ParentApi extends HasSerializedChildState<SerializedState> = HasSerializedChildState<SerializedState>
>({
  type,
  maybeId,
  getParentApi,
  panelProps,
  onAnyStateChange,
  onApiAvailable,
  hidePanelChrome,
}: {
  type: string;
  maybeId?: string;
  getParentApi: () => ParentApi;
  onApiAvailable?: (api: Api) => void;
  panelProps?: Pick<
    PresentationPanelProps<Api>,
    | 'showShadow'
    | 'showBorder'
    | 'showBadges'
    | 'showNotifications'
    | 'hideHeader'
    | 'hideInspector'
  >;
  hidePanelChrome?: boolean;
  /**
   * This `onAnyStateChange` callback allows the parent to keep track of the state of the embeddable
   * as it changes. This is **not** expected to change over the lifetime of the component.
   */
  onAnyStateChange?: (state: SerializedPanelState<SerializedState>) => void;
}) => {
  const cleanupFunction = useRef<(() => void) | null>(null);
  const firstLoadCompleteTime = useRef<number | null>(null);

  const componentPromise = useMemo(
    () => {
      const uuid = maybeId ?? generateId();

      /**
       * Phase tracking instrumentation for telemetry
       */
      const phase$ = new BehaviorSubject<PhaseEvent | undefined>(undefined);
      const embeddableStartTime = performance.now();
      const reportPhaseChange = (loading: boolean) => {
        if (firstLoadCompleteTime.current === null) {
          firstLoadCompleteTime.current = performance.now();
        }
        const duration = firstLoadCompleteTime.current - embeddableStartTime;
        phase$.next({ id: uuid, status: loading ? 'loading' : 'rendered', timeToEvent: duration });
      };

      /**
       * Build the embeddable promise
       */
      return (async () => {
        const parentApi = getParentApi();
        const factory = await getReactEmbeddableFactory<SerializedState, Api, RuntimeState>(type);
        const subscriptions = new Subscription();

        const { initialState, startStateDiffing } = await initializeReactEmbeddableState<
          SerializedState,
          Api,
          RuntimeState
        >(uuid, factory, parentApi);

        const setApi = (
          apiRegistration: SetReactEmbeddableApiRegistration<SerializedState, Api>
        ) => {
          const fullApi = {
            ...apiRegistration,
            uuid,
            phase$,
            parentApi,
            type: factory.type,
          } as unknown as Api;
          onApiAvailable?.(fullApi);
          return fullApi;
        };

        const buildApi = (
          apiRegistration: BuildReactEmbeddableApiRegistration<SerializedState, Api>,
          comparators: StateComparators<RuntimeState>
        ) => {
          if (onAnyStateChange) {
            /**
             * To avoid unnecessary re-renders, only subscribe to the comparator publishing subjects if
             * an `onAnyStateChange` callback is provided
             */
            const comparatorDefinitions: Array<
              ComparatorDefinition<RuntimeState, keyof RuntimeState>
            > = Object.values(comparators);
            subscriptions.add(
              combineLatest(comparatorDefinitions.map((comparator) => comparator[0]))
                .pipe(
                  skip(1),
                  debounceTime(ON_STATE_CHANGE_DEBOUNCE),
                  switchMap(() => {
                    const isAsync =
                      apiRegistration.serializeState.prototype?.name === 'AsyncFunction';
                    return isAsync
                      ? (apiRegistration.serializeState() as Promise<
                          SerializedPanelState<SerializedState>
                        >)
                      : Promise.resolve(apiRegistration.serializeState());
                  })
                )
                .subscribe((serializedState) => {
                  onAnyStateChange(serializedState);
                })
            );
          }

          const { unsavedChanges, resetUnsavedChanges, cleanup, snapshotRuntimeState } =
            startStateDiffing(comparators);

          const fullApi = setApi({
            ...apiRegistration,
            unsavedChanges,
            resetUnsavedChanges,
            snapshotRuntimeState,
          } as unknown as SetReactEmbeddableApiRegistration<SerializedState, Api>);

          cleanupFunction.current = () => cleanup();
          return fullApi;
        };

        const { api, Component } = await factory.buildEmbeddable(
          initialState,
          buildApi,
          uuid,
          parentApi,
          setApi
        );

        if (apiPublishesDataLoading(api)) {
          subscriptions.add(
            api.dataLoading.subscribe((loading) => reportPhaseChange(Boolean(loading)))
          );
        } else {
          reportPhaseChange(false);
        }

        return React.forwardRef<typeof api>((_, ref) => {
          // expose the api into the imperative handle
          useImperativeHandle(ref, () => api, []);

          return <Component />;
        });
      })();
    },
    /**
     * Disabling exhaustive deps because we do not want to re-fetch the component
     * from the embeddable registry unless the type changes.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [type]
  );

  useEffect(() => {
    return () => {
      cleanupFunction.current?.();
    };
  }, []);

  return (
    <PresentationPanel<Api, {}>
      hidePanelChrome={hidePanelChrome}
      {...panelProps}
      Component={componentPromise}
    />
  );
};
