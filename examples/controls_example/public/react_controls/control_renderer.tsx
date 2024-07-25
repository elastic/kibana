/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useImperativeHandle, useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';

import { StateComparators } from '@kbn/presentation-publishing';

import { getControlFactory } from './control_factory_registry';
import { ControlGroupApi } from './control_group/types';
import { ControlPanel } from './components/control_panel';
import { ControlApiRegistration, DefaultControlApi, DefaultControlState } from './types';
import { initializeUnsavedChangesApi } from './control_unsaved_changes_api';

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
          const unsavedChanges = initializeUnsavedChangesApi<StateType>(
            initialState as StateType,
            parentApi,
            comparators
          );

          const fullApi = {
            ...apiRegistration,
            ...unsavedChanges.api,
            uuid,
            parentApi,
            unsavedChanges: new BehaviorSubject<Partial<StateType> | undefined>(undefined),
            resetUnsavedChanges: () => {},
            type: factory.type,
          } as unknown as ApiType;

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

  return <ControlPanel<ApiType> Component={component} uuid={uuid} />;
};
