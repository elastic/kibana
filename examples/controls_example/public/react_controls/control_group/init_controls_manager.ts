/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as generateId } from 'uuid';
import { PresentationContainer } from "@kbn/presentation-containers";
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

  return {
    controlsInOrder$: controlsInOrder$ as PublishingSubject<Array<ControlPanelState & { id: string }>>,
    setControlApi: (uuid: string, controlApi: DefaultControlApi) => {
      children$.next({
        ...children$.getValue(),
        [uuid]: controlApi,
      });
    },
    api: {
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
    } as PresentationContainer<DefaultControlApi>,
  }
}