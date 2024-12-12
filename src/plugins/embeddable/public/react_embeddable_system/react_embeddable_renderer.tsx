/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  apiHasRuntimeChildState,
  apiIsPresentationContainer,
  HasSerializedChildState,
  HasSnapshottableState,
  initializeUnsavedChanges,
  SerializedPanelState,
} from '@kbn/presentation-containers';
import { PresentationPanel, PresentationPanelProps } from '@kbn/presentation-panel-plugin/public';
import { ComparatorDefinition, StateComparators } from '@kbn/presentation-publishing';
import React, { useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { BehaviorSubject, combineLatest, debounceTime, skip, Subscription, switchMap } from 'rxjs';
import { v4 as generateId } from 'uuid';
import { getReactEmbeddableFactory } from './react_embeddable_registry';
import {
  BuildReactEmbeddableApiRegistration,
  DefaultEmbeddableApi,
  SetReactEmbeddableApiRegistration,
} from './types';
import { PhaseTracker } from './phase_tracker';

const ON_STATE_CHANGE_DEBOUNCE = 100;

/**
 * Renders a component from the React Embeddable registry into a Presentation Panel.
 *
 * TODO: Rename this to simply `Embeddable` when the legacy Embeddable system is removed.
 */
export const ReactEmbeddableRenderer = <
  SerializedState extends object = object,
  RuntimeState extends object = SerializedState,
  Api extends DefaultEmbeddableApi<SerializedState, RuntimeState> = DefaultEmbeddableApi<
    SerializedState,
    RuntimeState
  >,
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
    | 'hideLoader'
    | 'hideHeader'
    | 'hideInspector'
    | 'setDragHandles'
    | 'getActions'
  >;
  hidePanelChrome?: boolean;
  /**
   * This `onAnyStateChange` callback allows the parent to keep track of the state of the embeddable
   * as it changes. This is **not** expected to change over the lifetime of the component.
   */
  onAnyStateChange?: (state: SerializedPanelState<SerializedState>) => void;
}) => {
  const cleanupFunction = useRef<(() => void) | null>(null);
  const phaseTracker = useRef(new PhaseTracker());

  const componentPromise = useMemo(
    () => {
      const uuid = maybeId ?? generateId();

      /**
       * Build the embeddable promise
       */
      return (async () => {
        const parentApi = getParentApi();
        const subscriptions = new Subscription();

        const buildEmbeddable = async () => {
          const factory = await getReactEmbeddableFactory<SerializedState, RuntimeState, Api>(type);
          const serializedState = parentApi.getSerializedStateForChild(uuid);
          const lastSavedRuntimeState = serializedState
            ? await factory.deserializeState(serializedState)
            : ({} as RuntimeState);

          // If the parent provides runtime state for the child (usually as a state backup or cache),
          // we merge it with the last saved runtime state.
          const partialRuntimeState = apiHasRuntimeChildState<RuntimeState>(parentApi)
            ? parentApi.getRuntimeStateForChild(uuid) ?? ({} as Partial<RuntimeState>)
            : ({} as Partial<RuntimeState>);

          const initialRuntimeState = { ...lastSavedRuntimeState, ...partialRuntimeState };

          const setApi = (
            apiRegistration: SetReactEmbeddableApiRegistration<SerializedState, RuntimeState, Api>
          ) => {
            const hasLockedHoverActions$ = new BehaviorSubject(false);
            return {
              ...apiRegistration,
              uuid,
              phase$: phaseTracker.current.getPhase$(),
              parentApi,
              hasLockedHoverActions$,
              lockHoverActions: (lock: boolean) => {
                hasLockedHoverActions$.next(lock);
              },
              type: factory.type,
            } as unknown as Api;
          };

          const buildApi = (
            apiRegistration: BuildReactEmbeddableApiRegistration<
              SerializedState,
              RuntimeState,
              Api
            >,
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
                  .subscribe((nextSerializedState) => {
                    onAnyStateChange(nextSerializedState);
                  })
              );
            }

            const unsavedChanges = initializeUnsavedChanges<RuntimeState>(
              lastSavedRuntimeState,
              parentApi,
              comparators
            );

            const fullApi = setApi({
              ...apiRegistration,
              ...unsavedChanges.api,
            } as unknown as SetReactEmbeddableApiRegistration<SerializedState, RuntimeState, Api>);

            cleanupFunction.current = () => {
              subscriptions.unsubscribe();
              phaseTracker.current.cleanup();
              unsavedChanges.cleanup();
            };
            return fullApi as Api & HasSnapshottableState<RuntimeState>;
          };

          const { api, Component } = await factory.buildEmbeddable(
            initialRuntimeState,
            buildApi,
            uuid,
            parentApi,
            setApi,
            lastSavedRuntimeState
          );

          phaseTracker.current.trackPhaseEvents(uuid, api);

          return { api, Component };
        };

        try {
          const { api, Component } = await buildEmbeddable();
          onApiAvailable?.(api);
          return React.forwardRef<typeof api>((_, ref) => {
            // expose the api into the imperative handle
            useImperativeHandle(ref, () => api, []);

            return <Component />;
          });
        } catch (e) {
          /**
           * critical error encountered when trying to build the api / embeddable;
           * since no API is available, create a dummy API that allows the panel to be deleted
           * */
          const errorApi = {
            uuid,
            blockingError: new BehaviorSubject(e),
          } as unknown as Api;
          if (apiIsPresentationContainer(parentApi)) {
            errorApi.parentApi = parentApi;
          }
          return React.forwardRef<Api>((_, ref) => {
            // expose the dummy error api into the imperative handle
            useImperativeHandle(ref, () => errorApi, []);
            return null;
          });
        }
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
