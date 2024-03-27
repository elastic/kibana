/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  apiIsPresentationContainer,
  PresentationContainer,
  SerializedPanelState,
} from '@kbn/presentation-containers';
import { PresentationPanel, PresentationPanelProps } from '@kbn/presentation-panel-plugin/public';
import { StateComparators } from '@kbn/presentation-publishing';
import React, { useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { v4 as generateId } from 'uuid';
import { getReactEmbeddableFactory } from './react_embeddable_registry';
import { startTrackingEmbeddableUnsavedChanges } from './react_embeddable_unsaved_changes';
import { DefaultEmbeddableApi, ReactEmbeddableApiRegistration } from './types';

/**
 * Renders a component from the React Embeddable registry into a Presentation Panel.
 *
 * TODO: Rename this to simply `Embeddable` when the legacy Embeddable system is removed.
 */
export const ReactEmbeddableRenderer = <
  StateType extends object = object,
  ApiType extends DefaultEmbeddableApi<StateType> = DefaultEmbeddableApi<StateType>
>({
  maybeId,
  type,
  state,
  parentApi,
  onApiAvailable,
  panelProps,
}: {
  maybeId?: string;
  type: string;
  state: SerializedPanelState<StateType>;
  parentApi?: PresentationContainer;
  onApiAvailable?: (api: ApiType) => void;
  panelProps?: Pick<
    PresentationPanelProps<ApiType>,
    | 'showShadow'
    | 'showBorder'
    | 'showBadges'
    | 'showNotifications'
    | 'hideHeader'
    | 'hideInspector'
  >;
}) => {
  const cleanupFunction = useRef<(() => void) | null>(null);

  const componentPromise = useMemo(
    () =>
      (async () => {
        const uuid = maybeId ?? generateId();
        const factory = await getReactEmbeddableFactory<StateType, ApiType>(type);
        const registerApi = (
          apiRegistration: ReactEmbeddableApiRegistration<StateType, ApiType>,
          comparators: StateComparators<StateType>
        ) => {
          const { unsavedChanges, resetUnsavedChanges, cleanup } =
            startTrackingEmbeddableUnsavedChanges(
              uuid,
              parentApi,
              comparators,
              factory.deserializeState
            );
          const fullApi = {
            ...apiRegistration,
            uuid,
            parentApi,
            unsavedChanges,
            resetUnsavedChanges,
            type: factory.type,
          } as unknown as ApiType;
          if (parentApi && apiIsPresentationContainer(parentApi)) {
            parentApi.registerPanelApi(uuid, fullApi);
          }
          cleanupFunction.current = () => cleanup();
          onApiAvailable?.(fullApi);
          return fullApi;
        };

        const { api, Component } = await factory.buildEmbeddable(
          factory.deserializeState(state),
          registerApi,
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

  return <PresentationPanel {...panelProps} Component={componentPromise} />;
};
