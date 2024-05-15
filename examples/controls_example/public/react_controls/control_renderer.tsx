/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { v4 as generateId } from 'uuid';
// import { ControlPanel } from './control_panel';
// import { getReactEmbeddableFactory } from './react_embeddable_registry';
// import { startTrackingEmbeddableUnsavedChanges } from './react_embeddable_unsaved_changes';
import { ControlWidth } from '@kbn/controls-plugin/common';
import { OverlayStart } from '@kbn/core/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { startTrackingEmbeddableUnsavedChanges } from '@kbn/embeddable-plugin/public';
import { SerializedPanelState } from '@kbn/presentation-containers';
import { StateComparators } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import { getControlFactory } from './control_factory_registry';
import { ControlPanel } from './control_panel';
import {
  ControlApiRegistration,
  ControlStateRegistration,
  DefaultControlApi,
  DefaultControlState,
} from './types';
import { ControlGroupApi } from './control_group/types';

const ON_STATE_CHANGE_DEBOUNCE = 100;

/**
 * Renders a component from the control registry into a Control Panel
 */
export const ControlRenderer = <
  StateType extends DefaultControlState = DefaultControlState,
  ApiType extends DefaultControlApi = DefaultControlApi
>({
  maybeId,
  type,
  state,
  parentApi,
  services,
  onApiAvailable,
}: {
  maybeId?: string;
  type: string;
  state: StateType; // TODO: Delete this
  parentApi: ControlGroupApi;
  onApiAvailable?: (api: ApiType) => void;

  /** TODO: Remove this */
  services: { overlays: OverlayStart; dataViews: DataViewsPublicPluginStart };
}) => {
  const cleanupFunction = useRef<(() => void) | null>(null);

  const componentPromise = useMemo(
    () =>
      (async () => {
        const uuid = maybeId ?? generateId();
        const factory = getControlFactory<StateType, ApiType>(type);

        const registerApi = (
          apiRegistration: ControlApiRegistration<ApiType>,
          comparators: StateComparators<ControlStateRegistration<StateType>>
        ) => {
          // const grow = new BehaviorSubject<boolean | undefined>(state.grow);
          // const width = new BehaviorSubject<ControlWidth | undefined>(state.width);
          const { unsavedChanges, resetUnsavedChanges, cleanup } =
            startTrackingEmbeddableUnsavedChanges<StateType>(
              uuid,
              parentApi,
              comparators,
              // {
              //   ...comparators,
              // grow: [grow, (newGrow: boolean | undefined) => grow.next(newGrow)],
              // width: [width, (newWidth: ControlWidth | undefined) => width.next(newWidth)],
              // },
              (serializedState: SerializedPanelState<StateType>) => serializedState.rawState
            );
          // const panelTitle = new BehaviorSubject<string | undefined>(state.title);
          // const defaultPanelTitle = new BehaviorSubject<string | undefined>(state.fieldName); // only applicable for data controls - make this generic

          // const snapshotRuntimeState = () => {
          //   const comparatorKeys = Object.keys(embeddable.comparators) as Array<keyof RuntimeState>;
          //   return comparatorKeys.reduce((acc, key) => {
          //     acc[key] = comparators[key][0].value as RuntimeState[typeof key];
          //     return acc;
          //   }, {} as RuntimeState);
          // };

          const fullApi: ApiType = {
            ...apiRegistration,
            uuid,
            parentApi,
            unsavedChanges,
            resetUnsavedChanges,
            type: factory.type,
            // defaultPanelTitle,
            // grow,
            // width,
          };

          cleanupFunction.current = () => cleanup();
          onApiAvailable?.(fullApi);
          return fullApi;
        };

        const { api, Component } = factory.buildControl(state, registerApi, uuid, parentApi);

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

  return <ControlPanel<StateType> Component={componentPromise} />;
};
