/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useImperativeHandle, useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';
import { v4 as generateId } from 'uuid';

import { SerializedStyles } from '@emotion/react';
import { StateComparators } from '@kbn/presentation-publishing';

import { getControlFactory } from './control_factory_registry';
import { ControlGroupApi } from './control_group/types';
import { ControlPanel } from './control_panel';
import { ControlApiRegistration, DefaultControlApi, DefaultControlState } from './types';

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
}: {
  type: string;
  maybeId?: string;
  getParentApi: () => ControlGroupApi;
  onApiAvailable?: (api: ApiType) => void;
}) => {
  const component = useMemo(
    () =>
      (() => {
        const parentApi = getParentApi();
        const uuid = maybeId ?? generateId();
        const factory = getControlFactory<StateType, ApiType>(type);

        const buildApi = (
          apiRegistration: ControlApiRegistration<ApiType>,
          comparators: StateComparators<StateType> // TODO: Use these to calculate unsaved changes
        ): ApiType => {
          const fullApi = {
            ...apiRegistration,
            uuid,
            parentApi,
            unsavedChanges: new BehaviorSubject<Partial<StateType> | undefined>(undefined),
            resetUnsavedChanges: () => {},
            type: factory.type,
          } as unknown as ApiType;

          onApiAvailable?.(fullApi);
          return fullApi;
        };

        const { rawState: initialState } = parentApi.getSerializedStateForChild(uuid) ?? {};

        const { api, Component } = factory.buildControl(
          initialState as unknown as StateType,
          buildApi,
          uuid,
          parentApi
        );

        return React.forwardRef<typeof api, { css: SerializedStyles }>((props, ref) => {
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

  return <ControlPanel<ApiType> Component={component} />;
};
