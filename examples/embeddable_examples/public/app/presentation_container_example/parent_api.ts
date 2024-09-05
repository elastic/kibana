/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, Subject, combineLatest, map, merge } from 'rxjs';
import { v4 as generateId } from 'uuid';
import { asyncForEach } from '@kbn/std';
import { TimeRange } from '@kbn/es-query';
import { PanelPackage, apiHasSerializableState, childrenUnsavedChanges$, combineCompatibleChildrenApis, initializeUnsavedChanges } from '@kbn/presentation-containers';
import { isEqual, omit } from 'lodash';
import { PublishesDataLoading, ViewMode, apiPublishesDataLoading } from '@kbn/presentation-publishing';
import { DEFAULT_STATE, lastSavedState } from './last_saved_state';
import { unsavedChanges } from './unsaved_changes';
import { LastSavedState, ParentApi, UnsavedChanges } from './types';

export function getParentApi() {
  const lastSavedState$ = new BehaviorSubject<LastSavedState>(lastSavedState.load());
  const unsavedChanges$ = new BehaviorSubject<UnsavedChanges>(unsavedChanges.load());
  const children$ = new BehaviorSubject<{ [key: string]: unknown }>({});
  const dataLoading$ = new BehaviorSubject<boolean | undefined>(false);
  const panels$ = new BehaviorSubject<Array<{ id: string; type: string }>>(
    unsavedChanges$.value.panels ??
      lastSavedState$.value.panelsState.map(({ id, type }) => {
        return { id, type };
      })
  );
  const timeRange$ = new BehaviorSubject<TimeRange | undefined>(
    unsavedChanges$.value.timeRange ?? lastSavedState$.value.timeRange
  );
  // One could use `initializeUnsavedChanges` to set up unsaved changes observable.
  // Instead, decided to manually setup unsaved changes observable
  // since only timeRange state needs to be monitored.
  const timeRangeUnsavedChanges$ = timeRange$.pipe(map((currentTimeRange) => {
    const hasChanges = !isEqual(currentTimeRange, lastSavedState$.value.timeRange);
    return hasChanges ? { timeRange: currentTimeRange } : undefined;
  }));
  const reload$ = new Subject<void>();

  const saveNotification$ = new Subject<void>();

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

  const childrenDataLoadingSubscripiton = combineCompatibleChildrenApis<PublishesDataLoading, boolean | undefined>(
    { children$ },
    'dataLoading',
    apiPublishesDataLoading,
    undefined,
    // flatten method
    (values) => {
      return values.some((isLoading) => isLoading);
    }
  ).subscribe((isAtLeastOneChildLoading) => {
    dataLoading$.next(isAtLeastOneChildLoading);
  });

  return {
    cleanUp: () => {
      childrenDataLoadingSubscripiton.unsubscribe();
    },
    /**
     * api's needed by component that should not be shared with children
     */
    componentApi: {
      onReload: () => {
        reload$.next();
      },
      onSave: async () => {
        const panelsState: LastSavedState['panelsState'] = [];
        await asyncForEach(panels$.value, async ({ id, type }) => {
          try {
            const childApi = children$.value[id];
            if (apiHasSerializableState(childApi)) {
              panelsState.push({
                id,
                type,
                panelState: await childApi.serializeState()
              });
            }
          } catch (error) {
            // Unable to serialize panel state, just ignore since this is an example
          }
        })

        const savedState = {
          timeRange: timeRange$.value ?? DEFAULT_STATE.timeRange,
          panelsState
        }
        lastSavedState$.next(savedState);
        lastSavedState.save(savedState);
        saveNotification$.next();
      },
      panels$,
      setChild: (id: string, api: unknown) => {
        children$.next({
          ...children$.value,
          [id]: api,
        });
      },
      setTimeRange: (timeRange: TimeRange) => {
        timeRange$.next(timeRange);
      }
    },
    parentApi: {
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
      dataLoading: dataLoading$,
      getPanelCount: () => {
        return panels$.value.length;
      },
      hidePanelTitle: new BehaviorSubject<boolean | undefined>(false),
      replacePanel: async (idToRemove: string, newPanel: PanelPackage<object>) => {
        // TODO remove method from interface? It should not be required
      },
      reload$,
      removePanel: (id: string) => {
        panels$.next(panels$.value.filter(({ id: panelId }) => panelId !== id));

        const currentUnsavedChanges = unsavedChanges$.value;
        unsavedChanges$.next({
          ...currentUnsavedChanges,
          panelUnsavedChanges: omit(currentUnsavedChanges.panelUnsavedChanges ?? {}, id),
        });

        children$.next(omit(children$.value, id));
      },
      saveNotification$,
      viewMode: new BehaviorSubject<ViewMode>('edit'),
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
      resetUnsavedChanges: () => {
        timeRange$.next(lastSavedState$.value.timeRange);
        unsavedChanges$.next({});
      },
      timeRange$,
      unsavedChanges: combineLatest([
        timeRangeUnsavedChanges$,
        childrenUnsavedChanges$(children$),
      ]).pipe(
        map(([timeRangeUnsavedChanges, childrenUnsavedChanges]) => {
          const unsavedChanges: UnsavedChanges = {};
          if (timeRangeUnsavedChanges) {
            unsavedChanges.timeRange = timeRangeUnsavedChanges.timeRange;
          }
          if (childrenUnsavedChanges) {
            unsavedChanges.panelUnsavedChanges = childrenUnsavedChanges;
          }
          return Object.keys(unsavedChanges).length ? unsavedChanges : undefined;
        })
      ),
    } as unknown as ParentApi,
  };
}
