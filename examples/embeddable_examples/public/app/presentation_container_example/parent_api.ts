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
import {
  PanelPackage,
  apiHasSerializableState,
  childrenUnsavedChanges$,
  combineCompatibleChildrenApis,
} from '@kbn/presentation-containers';
import { isEqual, omit } from 'lodash';
import {
  PublishesDataLoading,
  ViewMode,
  apiPublishesDataLoading,
} from '@kbn/presentation-publishing';
import { DEFAULT_STATE, lastSavedState } from './last_saved_state';
import { unsavedChanges } from './unsaved_changes';
import { LastSavedState, ParentApi, UnsavedChanges } from './types';

export function getParentApi() {
  const initialUnsavedChanges = unsavedChanges.load();
  const initialSavedState = lastSavedState.load();
  let newPanels: Record<string, object> = {};
  const lastSavedState$ = new BehaviorSubject<
    LastSavedState & { panels: Array<{ id: string; type: string }> }
  >({
    ...initialSavedState,
    panels: initialSavedState.panelsState.map(({ id, type }) => {
      return { id, type };
    }),
  });
  const children$ = new BehaviorSubject<{ [key: string]: unknown }>({});
  const dataLoading$ = new BehaviorSubject<boolean | undefined>(false);
  const panels$ = new BehaviorSubject<Array<{ id: string; type: string }>>(
    initialUnsavedChanges.panels ?? lastSavedState$.value.panels
  );
  const timeRange$ = new BehaviorSubject<TimeRange | undefined>(
    initialUnsavedChanges.timeRange ?? initialSavedState.timeRange
  );

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

  const childrenDataLoadingSubscripiton = combineCompatibleChildrenApis<
    PublishesDataLoading,
    boolean | undefined
  >(
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

  // One could use `initializeUnsavedChanges` to set up unsaved changes observable.
  // Instead, decided to manually setup unsaved changes observable
  // since only timeRange and panels array need to be monitored.
  const timeRangeUnsavedChanges$ = timeRange$.pipe(
    map((currentTimeRange) => {
      const hasChanges = !isEqual(currentTimeRange, lastSavedState$.value.timeRange);
      return hasChanges ? { timeRange: currentTimeRange } : undefined;
    })
  );
  const panelsUnsavedChanges$ = panels$.pipe(
    map((currentPanels) => {
      const hasChanges = !isEqual(currentPanels, lastSavedState$.value.panels);
      return hasChanges ? { panels: currentPanels } : undefined;
    })
  );
  const unsavedChanges$ = combineLatest([
    timeRangeUnsavedChanges$,
    panelsUnsavedChanges$,
    childrenUnsavedChanges$(children$),
  ]).pipe(
    map(([timeRangeUnsavedChanges, panelsChanges, childrenUnsavedChanges]) => {
      const nextUnsavedChanges: UnsavedChanges = {};
      if (timeRangeUnsavedChanges) {
        nextUnsavedChanges.timeRange = timeRangeUnsavedChanges.timeRange;
      }
      if (panelsChanges) {
        nextUnsavedChanges.panels = panelsChanges.panels;
      }
      if (childrenUnsavedChanges) {
        nextUnsavedChanges.panelUnsavedChanges = childrenUnsavedChanges;
      }
      return Object.keys(nextUnsavedChanges).length ? nextUnsavedChanges : undefined;
    })
  );

  const unsavedChangesSubscription = unsavedChanges$.subscribe((nextUnsavedChanges) => {
    unsavedChanges.save(nextUnsavedChanges ?? {});
  });

  return {
    cleanUp: () => {
      childrenDataLoadingSubscripiton.unsubscribe();
      unsavedChangesSubscription.unsubscribe();
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
                panelState: await childApi.serializeState(),
              });
            }
          } catch (error) {
            // Unable to serialize panel state, just ignore since this is an example
          }
        });

        const savedState = {
          timeRange: timeRange$.value ?? DEFAULT_STATE.timeRange,
          panelsState,
        };
        lastSavedState$.next({
          ...savedState,
          panels: panelsState.map(({ id, type }) => {
            return { id, type };
          }),
        });
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
      },
    },
    parentApi: {
      addNewPanel: async ({ panelType, initialState }: PanelPackage) => {
        const id = generateId();
        panels$.next([...panels$.value, { id, type: panelType }]);
        newPanels[id] = initialState ?? {};
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
        children$.next(omit(children$.value, id));
      },
      saveNotification$,
      viewMode: new BehaviorSubject<ViewMode>('edit'),
      /**
       * return last saved embeddable state
       */
      getSerializedStateForChild: (childId: string) => {
        const panel = initialSavedState.panelsState.find(({ id }) => {
          return id === childId;
        });
        return panel ? panel.panelState : undefined;
      },
      /**
       * return previous session's unsaved changes for embeddable
       */
      getRuntimeStateForChild: (childId: string) => {
        return newPanels[childId] ?? initialUnsavedChanges.panelUnsavedChanges?.[childId];
      },
      resetUnsavedChanges: () => {
        timeRange$.next(lastSavedState$.value.timeRange);
        panels$.next(lastSavedState$.value.panels);
        newPanels = {};
      },
      timeRange$,
      unsavedChanges: unsavedChanges$,
    } as unknown as ParentApi,
  };
}
