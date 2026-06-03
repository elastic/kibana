/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  of,
  pairwise,
  skipWhile,
  switchMap,
  take,
  takeUntil,
  type Observable,
} from 'rxjs';

import type { ViewMode } from '../../publishes_view_mode';
import { apiPublishesViewMode } from '../../publishes_view_mode';
import { apiHasSections, apiPublishesChildren } from '../presentation_container';

export const initializeRelatedPanels = ({
  uuid,
  parentApi,
  relatedObservables,
  relatedSiblingObservables,
  isRelated,
}: {
  uuid: string;
  parentApi: unknown;
  relatedObservables?: Observable<unknown>[];
  relatedSiblingObservables?: string[];
  isRelated: (sibling: unknown) => boolean;
}): { relatedPanels$: BehaviorSubject<string[]> } => {
  const relatedPanels$ = new BehaviorSubject<string[]>([]);

  if (!apiPublishesChildren(parentApi)) {
    return { relatedPanels$ };
  }

  const childrenApi = parentApi;
  const section$ = apiHasSections(parentApi) ? parentApi.panelSection$(uuid) : of(undefined);
  const viewMode$: Observable<ViewMode> = apiPublishesViewMode(parentApi)
    ? parentApi.viewMode$
    : of('view' as ViewMode);

  const teardown$ = childrenApi.children$.pipe(
    pairwise(),
    filter(([prev, curr]) => uuid in prev && !(uuid in curr)),
    take(1)
  );

  combineLatest([
    viewMode$,
    'childrenLoading$' in parentApi
      ? (parentApi.childrenLoading$ as Observable<boolean>)
      : of(false),
  ])
    .pipe(
      skipWhile(([viewMode, childrenLoading]) => childrenLoading || viewMode !== 'edit'),
      distinctUntilChanged(),
      switchMap(([viewMode, childrenLoading]) => {
        return combineLatest([childrenApi.children$, section$]).pipe(
          switchMap(([children, section, ...relatedValues]) => {
            const siblingEntries = Object.entries(children).filter(
              ([siblingUuid]) => siblingUuid !== uuid
            );
            if (siblingEntries.length === 0) return of<string[]>([]);

            const siblingObservables =
              siblingEntries.map(([siblingUuid, sibling]) => {
                const siblingSection$: Observable<string | undefined> = apiHasSections(parentApi)
                  ? parentApi.panelSection$(siblingUuid)
                  : of(undefined);

                const otherObservables: Observable<unknown>[] = (
                  relatedSiblingObservables ?? []
                ).reduce(
                  (prev, key) =>
                    Object.hasOwn(sibling as object, key)
                      ? [...prev, (sibling as Record<string, Observable<unknown>>)[key]]
                      : prev,
                  [] as Observable<unknown>[]
                );

                return combineLatest([siblingSection$, ...otherObservables]).pipe(
                  map(([siblingSection]) => ({
                    uuid: siblingUuid,
                    sibling,
                    section: siblingSection,
                  }))
                );
              }) ?? [];

            return combineLatest(siblingObservables).pipe(
              map((siblings) => {
                const related: string[] = [];
                for (const { uuid: siblingUuid, sibling, section: siblingSection } of siblings) {
                  const compatibleScope = section === siblingSection || section === undefined;
                  if (compatibleScope && isRelated(sibling)) {
                    related.push(siblingUuid);
                  }
                }

                return related;
              })
            );
          })
        );
      }),
      distinctUntilChanged(deepEqual),
      takeUntil(teardown$)
    )
    .subscribe((next) => {
      relatedPanels$.next(next);
    });

  return { relatedPanels$ };
};
