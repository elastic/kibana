/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useImperativeHandle, useMemo, useRef } from 'react';

import { initializeUnsavedChanges, StateComparators } from '@kbn/presentation-publishing';

import { getControlFactory } from './control_factory_registry';
import { ControlGroupApi } from './control_group/types';
import { ControlPanel } from './components/control_panel';
import { ControlApiRegistration, DefaultControlApi, DefaultControlState } from './types';

/**
 * Renders a component from the control registry into a Control Panel
 */
export const ControlRenderer = <
  StateType extends DefaultControlState = DefaultControlState,
  ApiType extends DefaultControlApi = DefaultControlApi
>({
  type,
  uuid,
  getParentApi,
  onApiAvailable,
}: {
  type: string;
  uuid: string;
  getParentApi: () => ControlGroupApi;
  onApiAvailable?: (api: ApiType) => void;
}) => {
  const cleanupFunction = useRef<(() => void) | null>(null);

  const component = useMemo(
    () =>
      (() => {
        const parentApi = getParentApi();
        const factory = getControlFactory<StateType, ApiType>(type);
        const { rawState: initialState } = parentApi.getSerializedStateForChild(uuid) ?? {
          rawState: {},
        };

        const buildApi = (
          apiRegistration: ControlApiRegistration<ApiType>,
          comparators: StateComparators<StateType>
        ): ApiType => {
          const unsavedChanges = initializeUnsavedChanges<StateType>(
            initialState as StateType,
            parentApi,
            comparators
          );

          const fullApi = {
            ...apiRegistration,
            ...unsavedChanges.api,
            uuid,
            parentApi,
            type: factory.type,
          } as unknown as ApiType;

          cleanupFunction.current = () => unsavedChanges.cleanup();
          onApiAvailable?.(fullApi);
          return fullApi;
        };

        const { api, Component } = factory.buildControl(
          initialState as StateType,
          buildApi,
          uuid,
          parentApi
        );

        return React.forwardRef<typeof api, { className: string }>((props, ref) => {
          // expose the api into the imperative handle
          useImperativeHandle(ref, () => api, []);

          return <Component {...props} />;
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

  return <ControlPanel<ApiType> Component={component} uuid={uuid} />;
};
