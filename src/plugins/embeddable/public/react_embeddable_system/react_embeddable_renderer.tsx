/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HasSerializedChildState, SerializedPanelState } from '@kbn/presentation-containers';
import { PresentationPanel, PresentationPanelProps } from '@kbn/presentation-panel-plugin/public';
import { ComparatorDefinition, StateComparators } from '@kbn/presentation-publishing';
import React, { useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { combineLatest, debounceTime, skip, switchMap } from 'rxjs';
import { v4 as generateId } from 'uuid';
import { getReactEmbeddableFactory } from './react_embeddable_registry';
import { initializeReactEmbeddableState } from './react_embeddable_state';
import { DefaultEmbeddableApi, ReactEmbeddableApiRegistration } from './types';

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

  const componentPromise = useMemo(
    () =>
      (async () => {
        const parentApi = getParentApi();
        const uuid = maybeId ?? generateId();
        const factory = await getReactEmbeddableFactory<SerializedState, Api, RuntimeState>(type);

        const { initialState, startStateDiffing } = await initializeReactEmbeddableState<
          SerializedState,
          Api,
          RuntimeState
        >(uuid, factory, parentApi);

        const buildApi = (
          apiRegistration: ReactEmbeddableApiRegistration<SerializedState, Api>,
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
              });
          }

          const { unsavedChanges, resetUnsavedChanges, cleanup, snapshotRuntimeState } =
            startStateDiffing(comparators);
          const fullApi = {
            ...apiRegistration,
            uuid,
            parentApi,
            unsavedChanges,
            type: factory.type,
            resetUnsavedChanges,
            snapshotRuntimeState,
          } as unknown as Api;
          cleanupFunction.current = () => cleanup();
          onApiAvailable?.(fullApi);
          return fullApi;
        };

        const { api, Component } = await factory.buildEmbeddable(
          initialState,
          buildApi,
          uuid,
          parentApi
        );

        return React.forwardRef<typeof api>((_, ref) => {
          // expose the api into the imperative handle
          useImperativeHandle(ref, () => api, []);

          return <Component />;
        });
      })(),
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
