/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { BehaviorSubject } from 'rxjs';

import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import { StateComparators } from '@kbn/presentation-publishing';

import type { DefaultControlState } from '../../../../common';
import { getControlFactory } from '../../control_factory_registry';
import type { ControlApiRegistration, DefaultControlApi } from '../../controls/types';
import type { ControlGroupApi } from '../types';
import { ControlPanel } from './control_panel';

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
  isControlGroupInitialized,
  className,
}: {
  type: string;
  uuid: string;
  getParentApi: () => ControlGroupApi;
  onApiAvailable?: (api: ApiType) => void;
  isControlGroupInitialized: boolean;
  className?: string;
}) => {
  const cleanupFunction = useRef<(() => void) | null>(null);

  const [component, setComponent] = useState<undefined | React.FC<{ className: string }>>(
    undefined
  );

  useEffect(
    () => {
      let ignore = false;

      async function buildControl() {
        const parentApi = getParentApi();
        const factory = getControlFactory<StateType, ApiType>(type);
        const buildApi = (
          apiRegistration: ControlApiRegistration<ApiType>,
          comparators: StateComparators<StateType>
        ): ApiType => {
          const unsavedChanges = initializeUnsavedChanges<StateType>(
            parentApi.getLastSavedControlState(uuid) as StateType,
            parentApi,
            comparators
          );

          cleanupFunction.current = () => unsavedChanges.cleanup();

          return {
            ...apiRegistration,
            ...unsavedChanges.api,
            uuid,
            parentApi,
            type: factory.type,
          } as unknown as ApiType;
        };

        const { rawState: initialState } = parentApi.getSerializedStateForChild(uuid) ?? {
          rawState: {},
        };
        return await factory.buildControl(initialState as StateType, buildApi, uuid, parentApi);
      }

      buildControl()
        .then(({ api, Component }) => {
          if (ignore) {
            return;
          }

          onApiAvailable?.(api);

          setComponent(
            React.forwardRef<typeof api, { className: string }>((props, ref) => {
              // expose the api into the imperative handle
              useImperativeHandle(ref, () => api, []);
              return <Component {...props} />;
            })
          );
        })
        .catch((error) => {
          if (ignore) {
            return;
          }
          /**
           * critical error encountered when trying to build the control;
           * since no API is available, create a dummy API that allows the control to be deleted
           * */
          const errorApi = {
            uuid,
            blockingError: new BehaviorSubject(error),
          };
          setComponent(
            React.forwardRef<typeof errorApi, { className: string }>((_, ref) => {
              // expose the dummy error api into the imperative handle
              useImperativeHandle(ref, () => errorApi, []);
              return null;
            })
          );
        });

      return () => {
        ignore = true;
      };
    },
    /**
     * Disabling exhaustive deps because we do not want to re-fetch the component
     * unless the type changes.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [type]
  );

  useEffect(() => {
    return () => {
      cleanupFunction.current?.();
    };
  }, []);

  return component && isControlGroupInitialized ? (
    // @ts-expect-error
    <ControlPanel<ApiType> Component={component} uuid={uuid} />
  ) : // Control group will not display controls until all controls are initialized
  null;
};
