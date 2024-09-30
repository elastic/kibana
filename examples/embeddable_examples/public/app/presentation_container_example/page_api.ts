/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  PublishingSubject,
  ViewMode,
  apiPublishesDataLoading,
  apiPublishesUnsavedChanges,
} from '@kbn/presentation-publishing';
import { DEFAULT_STATE, lastSavedStateSessionStorage } from './session_storage/last_saved_state';
import { unsavedChangesSessionStorage } from './session_storage/unsaved_changes';
import { LastSavedState, PageApi, UnsavedChanges } from './types';

export function getPageApi() {
  const initialUnsavedChanges = unsavedChangesSessionStorage.load();
  const initialSavedState = lastSavedStateSessionStorage.load();
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
  const timeRangeUnsavedChanges$ = combineLatest([timeRange$, lastSavedState$]).pipe(
    map(([currentTimeRange, lastSavedState]) => {
      const hasChanges = !isEqual(currentTimeRange, lastSavedState.timeRange);
      return hasChanges ? { timeRange: currentTimeRange } : undefined;
    })
  );
  const panelsUnsavedChanges$ = combineLatest([panels$, lastSavedState$]).pipe(
    map(([currentPanels, lastSavedState]) => {
      const hasChanges = !isEqual(currentPanels, lastSavedState.panels);
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
    unsavedChangesSessionStorage.save(nextUnsavedChanges ?? {});
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
        lastSavedStateSessionStorage.save(savedState);
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
    pageApi: {
      addNewPanel: async ({ panelType, initialState }: PanelPackage) => {
        const id = generateId();
        panels$.next([...panels$.value, { id, type: panelType }]);
        newPanels[id] = initialState ?? {};
        return await untilChildLoaded(id);
      },
      canRemovePanels: () => true,
      children$,
      dataLoading: dataLoading$,
      executionContext: {
        type: 'presentationContainerEmbeddableExample',
      },
      getAllDataViews: () => {
        // TODO remove once dashboard converted to API and use `PublishesDataViews` interface
        return [];
      },
      getPanelCount: () => {
        return panels$.value.length;
      },
      replacePanel: async (idToRemove: string, newPanel: PanelPackage<object>) => {
        // TODO remove method from interface? It should not be required
        return '';
      },
      reload$: reload$ as unknown as PublishingSubject<void>,
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
        lastSavedState$.value.panels.forEach(({ id }) => {
          const childApi = children$.value[id];
          if (apiPublishesUnsavedChanges(childApi)) {
            childApi.resetUnsavedChanges();
          }
        });
        const nextPanelIds = lastSavedState$.value.panels.map(({ id }) => id);
        const children = { ...children$.value };
        let modifiedChildren = false;
        Object.keys(children).forEach((controlId) => {
          if (!nextPanelIds.includes(controlId)) {
            // remove children that no longer exist after reset
            delete children[controlId];
            modifiedChildren = true;
          }
        });
        if (modifiedChildren) {
          children$.next(children);
        }
        newPanels = {};
      },
      timeRange$,
      unsavedChanges: unsavedChanges$ as PublishingSubject<object | undefined>,
    } as PageApi,
  };
}
