/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiIsPresentationContainer, HasSerializedChildState } from '@kbn/presentation-containers';
import { PresentationPanel, PresentationPanelProps } from '@kbn/presentation-panel-plugin/public';
import { SerializedPanelState } from '@kbn/presentation-publishing';
import React, { useImperativeHandle, useMemo, useRef } from 'react';
import { BehaviorSubject } from 'rxjs';
import { v4 as generateId } from 'uuid';
import { PhaseTracker } from './phase_tracker';
import { getReactEmbeddableFactory } from './react_embeddable_registry';
import { DefaultEmbeddableApi, EmbeddableApiRegistration } from './types';

/**
 * Renders a component from the React Embeddable registry into a Presentation Panel.
 */
export const EmbeddableRenderer = <
  SerializedState extends object = object,
  Api extends DefaultEmbeddableApi<SerializedState> = DefaultEmbeddableApi<SerializedState>,
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
  const phaseTracker = useRef(new PhaseTracker());

  const componentPromise = useMemo(
    () => {
      const uuid = maybeId ?? generateId();

      /**
       * Build the embeddable
       */
      return (async () => {
        const parentApi = getParentApi();

        const buildEmbeddable = async () => {
          const factory = await getReactEmbeddableFactory<SerializedState, Api>(type);

          const finalizeApi = (
            apiRegistration: EmbeddableApiRegistration<SerializedState, Api>
          ) => {
            if (onAnyStateChange) {
              /**
               * SERIALIZED STATE ONLY TODO  - canvas will be broken until we find a different way of handling this. Since we're decoupling the state management
               * from the embeddable this could be difficult. Ideally onAnyStateChange could be an observable on the API instead of a callback
               * and we could populate it from the state manager implementaiton.
               */
            }

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

          const initialState = parentApi.getSerializedStateForChild(uuid);
          const { api, Component } = await factory.buildEmbeddable({
            initialState,
            finalizeApi,
            uuid,
            parentApi,
          });

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
            blockingError$: new BehaviorSubject(e),
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

  return (
    <PresentationPanel<Api, {}>
      hidePanelChrome={hidePanelChrome}
      {...panelProps}
      Component={componentPromise}
    />
  );
};
