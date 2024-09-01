/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, merge } from 'rxjs';
import { v4 as generateId } from 'uuid';
import { TimeRange } from '@kbn/es-query';
import { PanelPackage } from '@kbn/presentation-containers';
import { omit } from 'lodash';
import { lastSavedState } from './last_saved_state';
import { unsavedChanges } from './unsaved_changes';
import { LastSavedState, ParentApi, UnsavedChanges } from './types';

export function getParentApi(): ParentApi {
  const lastSavedState$ = new BehaviorSubject<LastSavedState>(lastSavedState.load());
  const unsavedChanges$ = new BehaviorSubject<UnsavedChanges>(unsavedChanges.load());

  const children$ = new BehaviorSubject<{ [key: string]: unknown }>({});
  const panels$ = new BehaviorSubject<Array<{ id: string; type: string }>>(
    unsavedChanges$.value.panels ??
      lastSavedState$.value.panelsState.map(({ id, type }) => {
        return { id, type };
      })
  );

  const timeRange$ = new BehaviorSubject<TimeRange | undefined>(
    unsavedChanges$.value.timeRange ?? lastSavedState$.value.timeRange
  );

  function untilChildLoaded(childId: string): unknown | Promise<unknown | undefined> {
    if (children$.value[childId]) {
      return children$.value[childId];
    }

    return new Promise((resolve) => {
      const subscription = merge(children$, panels$).subscribe(() => {
        if (children$.value[childId]) {
          subscription.unsubscribe();
          resolve(children$.value[childId]);
          return;
        }

        const panelExists = panels$.value.some(({ id }) => id === childId);
        if (!panelExists) {
          // panel removed before finished loading.
          subscription.unsubscribe();
          resolve(undefined);
        }
      });
    });
  }

  return {
    addNewPanel: async ({ panelType, initialState }: PanelPackage) => {
      const id = generateId();
      panels$.next([...panels$.value, { id, type: panelType }]);
      const currentUnsavedChanges = unsavedChanges$.value;
      unsavedChanges$.next({
        ...currentUnsavedChanges,
        panelUnsavedChanges: {
          ...(currentUnsavedChanges.panelUnsavedChanges ?? {}),
          [id]: initialState ?? {},
        },
      });
      return await untilChildLoaded(id);
    },
    canRemovePanels: () => true,
    children$,
    getPanelCount: () => {
      return panels$.value.length;
    },
    removePanel: (id: string) => {
      panels$.next(panels$.value.filter(({ id: panelId }) => panelId !== id));

      const currentUnsavedChanges = unsavedChanges$.value;
      unsavedChanges$.next({
        ...currentUnsavedChanges,
        panelUnsavedChanges: omit(currentUnsavedChanges.panelUnsavedChanges ?? {}, id),
      });

      children$.next(omit(children$.value, id));
    },
    setChild: (id: string, api: unknown) => {
      children$.next({
        ...children$.value,
        [id]: api,
      });
    },
    /**
     * return last saved embeddable state
     */
    getSerializedStateForChild: (childId: string) => {
      const panel = lastSavedState$.value.panelsState.find(({ id }) => {
        return id === childId;
      });
      return panel ? panel.panelState : undefined;
    },
    /**
     * return previous session's unsaved changes for embeddable
     */
    getRuntimeStateForChild: (childId: string) => {
      const panelUnsavedChanges = unsavedChanges$.value.panelUnsavedChanges;
      return panelUnsavedChanges ? panelUnsavedChanges[childId] : undefined;
    },
    panels$,
    timeRange$,
  };
}
