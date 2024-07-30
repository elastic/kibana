/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as generateId } from 'uuid';
import {
  HasSerializedChildState,
  PanelPackage,
  PresentationContainer,
} from '@kbn/presentation-containers';
import type { Reference } from '@kbn/content-management-utils';
import { BehaviorSubject, first, merge } from 'rxjs';
import { PublishingSubject } from '@kbn/presentation-publishing';
import { omit } from 'lodash';
import { ControlPanelsState, ControlPanelState } from './types';
import { DefaultControlApi, DefaultControlState } from '../types';

export type ControlsInOrder = Array<{ id: string; type: string }>;

export function initControlsManager(initialControlPanelsState: ControlPanelsState) {
  const initialControlIds = Object.keys(initialControlPanelsState);
  const children$ = new BehaviorSubject<{ [key: string]: DefaultControlApi }>({});
  const controlsPanelState: { [panelId: string]: DefaultControlState } = {
    ...initialControlPanelsState,
  };
  const controlsInOrder$ = new BehaviorSubject<ControlsInOrder>(
    Object.keys(initialControlPanelsState)
      .map((key) => ({
        id: key,
        order: initialControlPanelsState[key].order,
        type: initialControlPanelsState[key].type,
      }))
      .sort((a, b) => (a.order > b.order ? 1 : -1))
      .map(({ id, type }) => ({ id, type })) // filter out `order`
  );

  function untilControlLoaded(
    id: string
  ): DefaultControlApi | Promise<DefaultControlApi | undefined> {
    if (children$.value[id]) {
      return children$.value[id];
    }

    return new Promise((resolve) => {
      const subscription = merge(children$, controlsInOrder$).subscribe(() => {
        if (children$.value[id]) {
          subscription.unsubscribe();
          resolve(children$.value[id]);
          return;
        }

        // control removed before the control finished loading.
        const controlState = controlsInOrder$.value.find((element) => element.id === id);
        if (!controlState) {
          subscription.unsubscribe();
          resolve(undefined);
        }
      });
    });
  }

  function getControlApi(controlUuid: string) {
    return children$.value[controlUuid];
  }

  async function addNewPanel(
    { panelType, initialState }: PanelPackage<DefaultControlState>,
    index: number
  ) {
    const id = generateId();
    const nextControlsInOrder = [...controlsInOrder$.value];
    nextControlsInOrder.splice(index, 0, {
      id,
      type: panelType,
    });
    controlsInOrder$.next(nextControlsInOrder);
    controlsPanelState[id] = initialState ?? {};
    return await untilControlLoaded(id);
  }

  function removePanel(panelId: string) {
    delete controlsPanelState[panelId];
    controlsInOrder$.next(controlsInOrder$.value.filter(({ id }) => id !== panelId));
    children$.next(omit(children$.value, panelId));
  }

  return {
    controlsInOrder$,
    getControlApi,
    setControlApi: (uuid: string, controlApi: DefaultControlApi) => {
      children$.next({
        ...children$.getValue(),
        [uuid]: controlApi,
      });
    },
    serializeControls: () => {
      const references: Reference[] = [];
      const explicitInputPanels: {
        [panelId: string]: ControlPanelState & { explicitInput: object };
      } = {};

      controlsInOrder$.getValue().forEach(({ id }, index) => {
        const controlApi = getControlApi(id);
        if (!controlApi) {
          return;
        }

        const {
          rawState: { grow, width, ...rest },
          references: controlReferences,
        } = controlApi.serializeState();

        if (controlReferences && controlReferences.length > 0) {
          references.push(...controlReferences);
        }

        explicitInputPanels[id] = {
          grow,
          order: index,
          type: controlApi.type,
          width,
          /** Re-add the `explicitInput` layer on serialize so control group saved object retains shape */
          explicitInput: rest,
        };
      });

      return {
        panelsJSON: JSON.stringify(explicitInputPanels),
        references,
      };
    },
    api: {
      getSerializedStateForChild: (childId: string) => {
        const controlPanelState = controlsPanelState[childId];
        return controlPanelState ? { rawState: controlPanelState } : undefined;
      },
      children$: children$ as PublishingSubject<{
        [key: string]: DefaultControlApi;
      }>,
      getPanelCount: () => {
        return controlsInOrder$.value.length;
      },
      addNewPanel: async (panel: PanelPackage<DefaultControlState>) => {
        return addNewPanel(panel, controlsInOrder$.value.length);
      },
      removePanel,
      replacePanel: async (panelId, newPanel) => {
        const index = controlsInOrder$.value.findIndex(({ id }) => id === panelId);
        removePanel(panelId);
        const controlApi = await addNewPanel(
          newPanel,
          index >= 0 ? index : controlsInOrder$.value.length
        );
        return controlApi ? controlApi.uuid : '';
      },
      untilInitialized: () => {
        return new Promise((resolve) => {
          children$
            .pipe(
              first((children) => {
                const atLeastOneControlNotInitialized = initialControlIds.some(
                  (controlId) => !children[controlId]
                );
                return !atLeastOneControlNotInitialized;
              })
            )
            .subscribe(() => {
              resolve();
            });
        });
      },
    } as PresentationContainer &
      HasSerializedChildState<ControlPanelState> & { untilInitialized: () => Promise<void> },
  };
}
