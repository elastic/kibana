/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as generateId } from 'uuid';
import { SerializedPanelState } from '@kbn/presentation-containers';
import React, { useEffect, useImperativeHandle, useMemo, useRef } from 'react';
// import { ControlPanel } from './control_panel';
// import { getReactEmbeddableFactory } from './react_embeddable_registry';
// import { startTrackingEmbeddableUnsavedChanges } from './react_embeddable_unsaved_changes';
import { ControlApiRegistration, ControlGroupApi, DefaultControlApi } from './types';
import { getControlFactory } from './control_factory_registry';
import { startTrackingEmbeddableUnsavedChanges } from '@kbn/embeddable-plugin/public';
import { BehaviorSubject, combineLatest, debounceTime, skip } from 'rxjs';
import { ComparatorDefinition, StateComparators } from '@kbn/presentation-publishing';
import { ControlPanel } from './control_panel';

const ON_STATE_CHANGE_DEBOUNCE = 100;

/**
 * Renders a component from the control registry into a Control Panel
 */
export const ControlRenderer = <StateType extends object = object>({
  maybeId,
  type,
  state,
  parentApi,
  onAnyStateChange,
}: {
  maybeId?: string;
  type: string;
  state: StateType; // TODO: Delete this
  parentApi?: ControlGroupApi; // TODO: Make required
  /**
   * This `onAnyStateChange` callback allows the parent to keep track of the state of the embeddable
   * as it changes. This is **not** expected to change over the lifetime of the component.
   */
  onAnyStateChange?: (state: SerializedPanelState<StateType>) => void;
}) => {
  const cleanupFunction = useRef<(() => void) | null>(null);

  const componentPromise = useMemo(
    () =>
      (async () => {
        const uuid = maybeId ?? generateId();
        const factory = await getControlFactory<StateType>(type);

        const registerApi = (
          apiRegistration: ControlApiRegistration<StateType>,
          comparators: StateComparators<StateType>
        ) => {
          const { unsavedChanges, resetUnsavedChanges, cleanup } =
            startTrackingEmbeddableUnsavedChanges(uuid, parentApi, comparators, state);
          const grow$ = new BehaviorSubject<boolean | undefined>(state.grow);
          const width$ = new BehaviorSubject<ControlWidth | undefined>(state.width);

          const defaultPanelTitle = new BehaviorSubject<string | undefined>('TEST');

          if (onAnyStateChange) {
            /**
             * To avoid unnecessary re-renders, only subscribe to the comparator publishing subjects if
             * an `onAnyStateChange` callback is provided
             */
            const comparatorDefinitions: Array<ComparatorDefinition<StateType, keyof StateType>> =
              Object.values(comparators);
            combineLatest(comparatorDefinitions.map((comparator) => comparator[0]))
              .pipe(skip(1), debounceTime(ON_STATE_CHANGE_DEBOUNCE))
              .subscribe(() => {
                onAnyStateChange(apiRegistration.serializeState());
              });
          }

          // const snapshotRuntimeState = () => {
          //   const comparatorKeys = Object.keys(embeddable.comparators) as Array<keyof RuntimeState>;
          //   return comparatorKeys.reduce((acc, key) => {
          //     acc[key] = comparators[key][0].value as RuntimeState[typeof key];
          //     return acc;
          //   }, {} as RuntimeState);
          // };

          const fullApi: DefaultControlApi<StateType> = {
            ...apiRegistration,
            uuid,
            parentApi,
            unsavedChanges,
            resetUnsavedChanges,
            type: factory.type,
            defaultPanelTitle,
            grow$,
            width$,
          };
          cleanupFunction.current = () => cleanup();
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
