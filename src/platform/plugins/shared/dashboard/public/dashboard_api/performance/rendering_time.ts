/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { combineLatest, map, switchMap, skipWhile, of, startWith, debounceTime, Subscription, BehaviorSubject } from 'rxjs';

import { PresentationContainer } from '@kbn/presentation-containers';
import { PublishesRendered, apiPublishesDataLoading, apiPublishesRendered, fetch$ } from '@kbn/presentation-publishing';
import { lensActions } from '@kbn/lens-plugin/public/state_management/lens_slice';

// mock lens
/*rendered$ = new BehaviorSubject(false);

fetch$().subscribe(() => {
  rendered$.next(false);
  await DataLoadingState();
  rendered$.next(false);
  await rendering();
  rendered$.next(true);
});

return {
  rendered$
}*/


// Captures data loading and rendered time
export function renderTimeTracking(
  dashboard: PresentationContainer
) {
  const childrenThatRender$ = dashboard.children$
  .pipe(
    skipWhile((children) => {
      // Don't track render-status when the dashboard is still adding embeddables.
      return Object.values(children).length !== dashboard.getPanelCount();
    }),
    map((children) => {
      // Filter for embeddables which publish rendered events
      const childrenThatRender: PublishesRendered[] = [];
      const values = Object.values(children);
      for (const child of values) {
        if (apiPublishesRendered(child)) {
          childrenThatRender.push(child);
        }
        /* else if (apiPublishesDataLoading(child)) {
          const rendered$ = new BehaviorSubject(!child.dataLoading$.value);
          child.dataLoading$.subscribe(dataLoading => {
            if (dataLoading && rendered$.value) {
              rendered$.next(false);
            }
          });
          childrenThatRender.push({ rendered$ })
        }*/
      }
      return childrenThatRender;
    }),
    switchMap((children) => {
      if (children.length === 0) {
        return of([]); // map to empty stream
      }

      // Map to new stream of phase-events for each embeddable
      return combineLatest(children.map((child) => child.rendered$));
    }),
    map((latestRenderedEvents) => {
      return latestRenderedEvents.every((rendered) => rendered);
    })
  );

  let subscription: Subscription | undefined;
  fetch$({ parentApi: dashboard }).pipe(startWith()).subscribe(() => {
    subscription?.unsubscribe();
    subscription = childrenThatRender$.subscribe(isRendered => {
      console.log('isRendered', isRendered);
    });
  });

  return () => {
    subscription?.unsubscribe();
  }

  /*return combineLatest(
      [
        fetch$({ parentApi: dashboard }).pipe(startWith()),
        childrenThatRender$
      ]).subscribe(([, isRendered]) => {
      console.log('isRendered', isRendered);
    });*/
}