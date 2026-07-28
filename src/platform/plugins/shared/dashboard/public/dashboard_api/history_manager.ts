/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  filter,
  map,
  skip,
  withLatestFrom,
} from 'rxjs';

import { apiHasUniqueId, apiPublishesUnsavedChanges } from '@kbn/presentation-publishing';
import { startTrackingHistory } from '@kbn/rxjs-history';

import type { DashboardState } from '../../common';
import type { initializeDataLoadingManager } from './data_loading_manager';
import type { initializeLayoutManager } from './layout_manager';
import type { DashboardChildren } from './layout_manager/types';
import type { initializeTrackOverlay } from './track_overlay';
import type { initializeUnsavedChangesManager } from './unsaved_changes_manager';
import { io } from 'fp-ts/lib/IO';

export function initializeHistoryManager({
  unsavedChanges$,
  hasOverlays$,
  setState,
  getState,
  children$,
  childrenLoading$,
  dataLoadingManager: {
    api: { dataLoading$ },
  },
}: {
  unsavedChanges$: ReturnType<
    typeof initializeUnsavedChangesManager
  >['internalApi']['unsavedChanges$'];
  hasOverlays$: ReturnType<typeof initializeTrackOverlay>['hasOverlays$'];
  childrenLoading$: ReturnType<typeof initializeLayoutManager>['internalApi']['childrenLoading$'];
  getState: () => DashboardState;
  setState: (state: DashboardState) => void;
  children$: BehaviorSubject<DashboardChildren>;
  dataLoadingManager: ReturnType<typeof initializeDataLoadingManager>;
}): {
  api: ReturnType<typeof startTrackingHistory<DashboardState>>['api'];
  cleanup: () => void;
} {
  const dashboardCurrentState$ = new BehaviorSubject<DashboardState | undefined>(undefined);
  const keepKeys$: BehaviorSubject<{ [panelId: string]: string[] }> = new BehaviorSubject({});

  combineLatest([children$, childrenLoading$, unsavedChanges$])
    .pipe(
      // wait for children to be done loading before grabbing skipped keys
      filter(([children, childrenLoading]) => !childrenLoading),
      map(([children]) => {
        console.log({ children });
        const keys: { [id: string]: string[] } = {};
        Object.entries(children).forEach(([uuid, child]) => {
          keys[uuid] = apiPublishesUnsavedChanges(child) ? child.getKeysWithUnsavedChanges() : [];
        });
        return keys;
      })
    )
    .subscribe((keys) => {
      console.log({ keys });
      keepKeys$.next(keys);
    });

  const onAnyStateChangeSubscription = unsavedChanges$
    .pipe(
      debounceTime(60),
      withLatestFrom(hasOverlays$),
      filter(([state, hasOverlays]) => !hasOverlays) // do not push to history as long as an editor is open
    )
    .subscribe(() => {
      const { panels, ...state } = getState();
      // console.log('CURRENT STATE', { ...state, panels });
      dashboardCurrentState$.next({
        ...state,
        panels: panels.sort(sortById),
      });
    });

  const { api: historyApi, cleanup: cleanupHistoryTracking } = startTrackingHistory<DashboardState>(
    {
      disableUndoRedo$: hasOverlays$,
      state$: dashboardCurrentState$,
      maxSize: 10,
      getPropertyFilter: () => {
        return (key, context) => {
          if (context.childName !== 'config') return true; // include all dashboard level keys
          // if (context.children) return true; // compare all parent keys
          const panelId =
            context.parent &&
            context.parent.parent &&
            context.parent.parent.childName === 'panels' &&
            context.parent.leftType === 'object' &&
            'id' in (context.parent.left as object)
              ? (context.parent.left as { id: string }).id
              : undefined;
          // console.log({ key, context, test: context.childName, panelId });
          if (panelId) {
            const keptKeys = keepKeys$.getValue()[panelId];
            return keptKeys.includes(key);
          }
          return true;
        };
      },
    }
  );

  // when the history's state updates, respond by setting state on the Dashboard
  const historyStateSubscription = historyApi.currentState$.subscribe((newState) => {
    setState(newState);
  });

  return {
    api: historyApi,
    cleanup: () => {
      historyStateSubscription.unsubscribe();
      onAnyStateChangeSubscription.unsubscribe();
      cleanupHistoryTracking();
    },
  };
}

// const getSkippedKeys = (children: DashboardChildren): { [panelId: string]: string[] } => {
//   const skippedKeys: { [panelId: string]: string[] } = {};
//   Object.values(children).forEach((child) => {
//     if (apiHasUniqueId(child)) {
//       skippedKeys[child.uuid] = Object.entries(child.getComparators()).reduce(
//         (prev, [key, val]) => (val === 'skip' ? [...prev, key] : prev),
//         [] as string[]
//       );
//     }
//   });
//   return skippedKeys;
// };

const sortById = (
  { id: idA }: DashboardState['panels'][number] | DashboardState['pinned_panels'][number],
  { id: idB }: DashboardState['panels'][number] | DashboardState['pinned_panels'][number]
) => (idA ?? '').localeCompare(idB ?? '');
