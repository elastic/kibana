/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Subject, combineLatest, map, merge, tap } from 'rxjs';
import { v4 as generateId } from 'uuid';
import type { TimeRange } from '@kbn/es-query';
import { isEqual, omit } from 'lodash';
import type {
  PanelPackage,
  PublishesDataLoading,
  PublishingSubject,
  ViewMode,
} from '@kbn/presentation-publishing';
import {
  apiHasSerializableState,
  apiPublishesDataLoading,
  apiPublishesUnsavedChanges,
  childrenUnsavedChanges$,
  combineCompatibleChildrenApis,
} from '@kbn/presentation-publishing';
import { lastSavedStateSessionStorage } from './session_storage/last_saved_state';
import { unsavedChangesSessionStorage } from './session_storage/unsaved_changes';
import type { PageApi, PageState } from './types';

function deserializePanels(panels: PageState['panels']) {
  const layout: Array<{ id: string; type: string }> = [];
  const childState: { [uuid: string]: object | undefined } = {};
  panels.forEach(({ id, type, serializedState }) => {
    layout.push({ id, type });
    childState[id] = serializedState;
  });
  return { layout, childState };
}

export function getPageApi() {
  const initialUnsavedState = unsavedChangesSessionStorage.load();
  const initialState = lastSavedStateSessionStorage.load();
  const lastSavedState$ = new BehaviorSubject<PageState>(initialState);
  const children$ = new BehaviorSubject<{ [key: string]: unknown }>({});
  const { layout: initialLayout, childState: initialChildState } = deserializePanels(
    initialUnsavedState?.panels ?? lastSavedState$.value.panels
  );
  const layout$ = new BehaviorSubject<Array<{ id: string; type: string }>>(initialLayout);
  let currentChildState = initialChildState; // childState is the source of truth for the state of each panel.

  const dataLoading$ = new BehaviorSubject<boolean | undefined>(false);
  const timeRange$ = new BehaviorSubject<TimeRange>(
    initialUnsavedState?.timeRange ?? initialState.timeRange
  );
  const reload$ = new Subject<void>();

  function serializePage() {
    return {
      timeRange: timeRange$.value,
      panels: layout$.value.map((layout) => ({
        ...layout,
        serializedState: currentChildState[layout.id],
      })),
    };
  }

  function getLastSavedStateForChild(childId: string) {
    const panel = lastSavedState$.value.panels.find(({ id }) => id === childId);
    return panel?.serializedState;
  }

  async function getChildApi(childId: string): Promise<unknown | undefined> {
    if (children$.value[childId]) {
      return children$.value[childId];
    }

    return new Promise((resolve) => {
      const subscription = merge(children$, layout$).subscribe(() => {
        if (children$.value[childId]) {
          subscription.unsubscribe();
          resolve(children$.value[childId]);
          return;
        }

        const panelExists = layout$.value.some(({ id }) => id === childId);
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
    'dataLoading$',
    apiPublishesDataLoading,
    undefined,
    // flatten method
    (values) => {
      return values.some((isLoading) => isLoading);
    }
  ).subscribe((isAtLeastOneChildLoading) => {
    dataLoading$.next(isAtLeastOneChildLoading);
  });

  const hasTimeRangeChanges$ = combineLatest([timeRange$, lastSavedState$]).pipe(
    map(([currentTimeRange, lastSavedState]) => {
      return !isEqual(currentTimeRange, lastSavedState.timeRange);
    })
  );
  const hasLayoutChanges$ = combineLatest([
    layout$,
    lastSavedState$.pipe(map((lastSavedState) => deserializePanels(lastSavedState.panels).layout)),
  ]).pipe(
    map(([currentLayout, lastSavedLayout]) => {
      return !isEqual(currentLayout, lastSavedLayout);
    })
  );
  const hasPanelChanges$ = childrenUnsavedChanges$(children$).pipe(
    tap((childrenWithChanges) => {
      // propagate the latest serialized state back to currentChildState.
      for (const { uuid, hasUnsavedChanges } of childrenWithChanges) {
        const childApi = children$.value[uuid];
        if (hasUnsavedChanges && apiHasSerializableState(childApi)) {
          currentChildState[uuid] = childApi.serializeState();
        }
      }
    }),
    map((childrenWithChanges) => {
      return childrenWithChanges.some(({ hasUnsavedChanges }) => hasUnsavedChanges);
    })
  );

  const hasUnsavedChanges$ = combineLatest([
    hasTimeRangeChanges$,
    hasLayoutChanges$,
    hasPanelChanges$,
  ]).pipe(
    map(([hasTimeRangeChanges, hasLayoutChanges, hasPanelChanges]) => {
      return hasTimeRangeChanges || hasLayoutChanges || hasPanelChanges;
    })
  );

  const hasUnsavedChangesSubscription = hasUnsavedChanges$.subscribe((hasUnsavedChanges) => {
    if (!hasUnsavedChanges) {
      unsavedChangesSessionStorage.clear();
      return;
    }

    unsavedChangesSessionStorage.save(serializePage());
  });

  return {
    cleanUp: () => {
      childrenDataLoadingSubscripiton.unsubscribe();
      hasUnsavedChangesSubscription.unsubscribe();
    },
    /**
     * api's needed by component that should not be shared with children
     */
    componentApi: {
      onReload: () => {
        reload$.next();
      },
      onSave: async () => {
        const serializedPage = serializePage();
        // simulate save await
        await new Promise((resolve) => setTimeout(resolve, 1000));
        lastSavedState$.next(serializedPage);
        lastSavedStateSessionStorage.save(serializedPage);
        unsavedChangesSessionStorage.clear();
      },
      layout$,
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
      addNewPanel: async ({ panelType, serializedState }: PanelPackage) => {
        const id = generateId();
        layout$.next([...layout$.value, { id, type: panelType }]);
        currentChildState[id] = serializedState;
        return await getChildApi(id);
      },
      canRemovePanels: () => true,
      getChildApi,
      children$,
      dataLoading$,
      executionContext: {
        type: 'presentationContainerEmbeddableExample',
      },
      getPanelCount: () => {
        return layout$.value.length;
      },
      replacePanel: async (idToRemove: string, newPanel: PanelPackage<object>) => {
        // TODO remove method from interface? It should not be required
        return '';
      },
      reload$: reload$ as unknown as PublishingSubject<void>,
      removePanel: (id: string) => {
        layout$.next(layout$.value.filter(({ id: panelId }) => panelId !== id));
        children$.next(omit(children$.value, id));
        delete currentChildState[id];
      },
      viewMode$: new BehaviorSubject<ViewMode>('edit'),
      getSerializedStateForChild: (childId: string) => currentChildState[childId],
      lastSavedStateForChild$: (panelId: string) =>
        lastSavedState$.pipe(map(() => getLastSavedStateForChild(panelId))),
      getLastSavedStateForChild,
      resetUnsavedChanges: () => {
        const lastSavedState = lastSavedState$.value;
        timeRange$.next(lastSavedState.timeRange);
        const { layout: lastSavedLayout, childState: lastSavedChildState } = deserializePanels(
          lastSavedState.panels
        );
        layout$.next(lastSavedLayout);
        currentChildState = lastSavedChildState;
        let childrenModified = false;
        const currentChildren = { ...children$.value };
        for (const uuid of Object.keys(currentChildren)) {
          const existsInLastSavedLayout = lastSavedLayout.some(({ id }) => id === uuid);
          if (existsInLastSavedLayout) {
            const child = currentChildren[uuid];
            if (apiPublishesUnsavedChanges(child)) child.resetUnsavedChanges();
          } else {
            // if reset resulted in panel removal, we need to update the list of children
            delete currentChildren[uuid];
            delete currentChildState[uuid];
            childrenModified = true;
          }
        }
        if (childrenModified) children$.next(currentChildren);
      },
      timeRange$,
      hasUnsavedChanges$,
    } as PageApi,
  };
}
