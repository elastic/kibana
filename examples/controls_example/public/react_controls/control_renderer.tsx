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
import { OverlayStart } from '@kbn/core/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { StateComparators } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import { getControlFactory } from './control_factory_registry';
import { ControlGroupApi } from './control_group/types';
import { ControlPanel } from './control_panel';
import { ControlApiRegistration, DefaultControlApi, DefaultControlState } from './types';

const ON_STATE_CHANGE_DEBOUNCE = 100;

/**
 * Renders a component from the control registry into a Control Panel
 */
export const ControlRenderer = <
  StateType extends DefaultControlState = DefaultControlState,
  ApiType extends DefaultControlApi = DefaultControlApi
>({
  type,
  maybeId,
  getParentApi,
  onApiAvailable,
  services,
}: {
  maybeId?: string;
  type: string;
  // parentApi: ControlGroupApi;
  getParentApi: () => ControlGroupApi;
  onApiAvailable?: (api: ApiType) => void;

  /** TODO: Remove this */
  services: { overlays: OverlayStart; dataViews: DataViewsPublicPluginStart };
}) => {
  // const cleanupFunction = useRef<(() => void) | null>(null);

  const component = useMemo(
    () =>
      (() => {
        const parentApi = getParentApi();
        const uuid = maybeId ?? generateId();
        const factory = getControlFactory<StateType, ApiType>(type);

        const buildApi = (
          apiRegistration: ControlApiRegistration<ApiType>,
          comparators: StateComparators<StateType>
        ): ApiType => {
          // const { unsavedChanges, resetUnsavedChanges, cleanup } =
          //   startTrackingEmbeddableUnsavedChanges<StateType>(
          //     uuid,
          //     parentApi,
          //     comparators,
          //     (serializedState: SerializedPanelState<StateType>) => serializedState.rawState
          //   );

          // const snapshotRuntimeState = () => {
          //   const comparatorKeys = Object.keys(embeddable.comparators) as Array<keyof RuntimeState>;
          //   return comparatorKeys.reduce((acc, key) => {
          //     acc[key] = comparators[key][0].value as RuntimeState[typeof key];
          //     return acc;
          //   }, {} as RuntimeState);
          // };

          const fullApi = {
            ...apiRegistration,
            uuid,
            parentApi,
            unsavedChanges: new BehaviorSubject<Partial<StateType> | undefined>(undefined),
            resetUnsavedChanges: () => {},
            type: factory.type,
            // defaultPanelTitle,
            // grow,
            // width,
          } as unknown as ApiType;

          // cleanupFunction.current = () => cleanup();
          onApiAvailable?.(fullApi);
          return fullApi;
        };

        const initialState = parentApi.getChildState<StateType>(uuid);

        const { api, Component } = factory.buildControl(initialState, buildApi, uuid, parentApi);

        console.log('api', api, 'Component', Component);

        return React.forwardRef<typeof api>((_, ref) => {
          // expose the api into the imperative handle
          useImperativeHandle(ref, () => api, []);
          console.log('HERE!!!', api);
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

  // useEffect(() => {
  //   return () => {
  //     cleanupFunction.current?.();
  //   };
  // }, []);

  return <ControlPanel<StateType, ApiType> Component={component} />;
};
