/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as generateId } from 'uuid';
import { HasSerializedChildState, PresentationContainer } from "@kbn/presentation-containers";
import { Reference } from '@kbn/content-management-utils';
import { BehaviorSubject, merge } from "rxjs";
import { ControlPanelsState, ControlPanelState } from "./types";
import { DefaultControlApi } from '../types';
import { PublishingSubject } from '@kbn/presentation-publishing';

export function initControlsManager(controlPanelsState: ControlPanelsState) {
  const children$ = new BehaviorSubject<{ [key: string]: DefaultControlApi }>({});
  const controlsInOrder$ = new BehaviorSubject<Array<ControlPanelState & { id: string }>>(
    Object.keys(controlPanelsState)
      .map((key) => ({
        id: key,
        ...controlPanelsState[key]
      }))
      .sort((a, b) => (a.order > b.order ? 1 : -1))
  );

  function untilControlLoaded(id: string): DefaultControlApi | Promise<DefaultControlApi | undefined> {
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
        const controlState = controlsInOrder$.value.find(controlPanelState => controlPanelState.id === id);
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

  return {
    controlsInOrder$: controlsInOrder$ as PublishingSubject<Array<ControlPanelState & { id: string }>>,
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
          explicitInput: rest
        };
      });

      return {
        panelsJSON: JSON.stringify(explicitInputPanels),
        references,
      };
    },
    api: {
      getSerializedStateForChild: (childId: string) => {
        const controlPanelState = controlsInOrder$.getValue().find(controlPanelState => controlPanelState.id === childId);
        return controlPanelState ? { rawState: controlPanelState } : undefined;
      },
      children$: children$ as PublishingSubject<{
        [key: string]: DefaultControlApi;
      }>,
      getPanelCount: () => {
        return controlsInOrder$.value.length
      },
      addNewPanel: async (panel) => {
        const id = generateId();
        const controlsInOrder = controlsInOrder$.getValue();
        controlsInOrder$.next([
          ...controlsInOrder,
          {
            id,
            type: panel.panelType,
            order: controlsInOrder.length,
            ...(panel.initialState ?? {}),
          }
        ]);
        return await untilControlLoaded(id);
      },
      removePanel: (panelId) => {
        // TODO: Remove a child control
      },
      replacePanel: async (panelId, newPanel) => {
        // TODO: Replace a child control
        return Promise.resolve(panelId);
      },
    } as PresentationContainer & HasSerializedChildState<ControlPanelState>,
  }
}