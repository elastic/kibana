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

/**
 * Initializes the subject that publishes which sibling panels in the parent container are related to panel `uuid`
 * @param uuid - The panel uuid to compute relations from
 * @param parentApi - The container parent parentApi
 * @param dependentObservables - Observables that should trigger a recompute whenever they emit
 * @param siblingDependentObservables - Observable names to pull from siblings; recompute that sibling's relation whenever they emit
 * @param isRelated - Comparator to use to check if a sibling within compatible scope is actually related to the panel
 */
export const initializeRelatedPanels = ({
  uuid,
  parentApi,
  dependentObservables,
  siblingDependentObservables,
  isRelated,
}: {
  uuid: string;
  parentApi: unknown;
  dependentObservables?: Observable<any>[];
  siblingDependentObservables?: string[];
  isRelated: (sibling: unknown) => boolean;
}): { relatedPanels$: BehaviorSubject<string[]> } => {
  const relatedPanels$ = new BehaviorSubject<string[]>([]);

  if (!apiPublishesChildren(parentApi)) {
    return { relatedPanels$ };
  }

  const section$ = apiHasSections(parentApi) ? parentApi.panelSection$(uuid) : of(undefined);
  const viewMode$: Observable<ViewMode> = apiPublishesViewMode(parentApi)
    ? parentApi.viewMode$
    : of('view' as ViewMode);

  const teardown$ = parentApi.children$.pipe(
    pairwise(),
    filter(([prev, curr]) => uuid in prev && !(uuid in curr)),
    take(1)
  );

  // From the parentApi, get the latest children so we can compare this panel to its sibling
  combineLatest([
    viewMode$,
    'childrenLoading$' in parentApi
      ? (parentApi.childrenLoading$ as Observable<boolean>)
      : of(false),
  ])
    .pipe(
      // First, make sure we're in edit view mode and that the children have all loaded
      skipWhile(([viewMode, childrenLoading]) => childrenLoading || viewMode !== 'edit'),
      distinctUntilChanged(),
      switchMap(() => {
        // Combine the dependentObservables so that the result recomputes when they change, even though we never use their values
        return combineLatest([parentApi.children$, section$, ...(dependentObservables ?? [])]).pipe(
          switchMap(([children, section]) => {
            // Get all this panel's siblings from the observed children by filtering out its own uuid
            const siblingEntries = Object.entries(children).filter(
              ([siblingUuid]) => siblingUuid !== uuid
            );
            if (siblingEntries.length === 0) return of<string[]>([]);

            const siblings$ =
              siblingEntries.map(([siblingUuid, sibling]) => {
                const siblingSection$: Observable<string | undefined> = apiHasSections(parentApi)
                  ? parentApi.panelSection$(siblingUuid)
                  : of(undefined);
                const recomputeSiblingsOnUpdateObservables: Observable<unknown>[] = (
                  siblingDependentObservables ?? []
                ).reduce(
                  (prev, key) =>
                    Object.hasOwn(sibling as object, key)
                      ? [...prev, (sibling as Record<string, Observable<unknown>>)[key]]
                      : prev,
                  [] as Observable<unknown>[]
                );

                return combineLatest([
                  siblingSection$,
                  ...recomputeSiblingsOnUpdateObservables,
                ]).pipe(
                  map(([siblingSection]) => ({
                    uuid: siblingUuid,
                    sibling,
                    section: siblingSection,
                  }))
                );
              }) ?? [];

            return combineLatest(siblings$).pipe(
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
