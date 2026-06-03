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

import { Parser, Walker } from '@elastic/esql';
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
            console.log({ siblingObservables });
            return combineLatest(siblingObservables).pipe(
              map((siblings) => {
                console.log({ siblings });
                const related: string[] = [];
                for (const { uuid: siblingUuid, sibling, section: siblingSection } of siblings) {
                  const compatibleScope = section === siblingSection || section === undefined;
                  if (compatibleScope && isRelated(sibling)) {
                    related.push(siblingUuid);
                  }

                  // if (isESQLControl) {
                  //   const siblingUsesESQLVariable =
                  //     siblingESQL &&
                  //     getESQLQueryVariables(siblingESQL).includes(esqlVariable$.value.key);

                  //   if (siblingUsesESQLVariable) {
                  //     // If a sibling uses this control's ES|QL variable, it's related
                  //     related.push(siblingUuid);
                  //     continue;
                  //   } else if (!isSiblingESQLControl) {
                  //     // If the sibling does not use this ES|QL control's variable, only bail out if the sibling is not
                  //     // also an ES|QL control. Otherwise, continue on to check if this control consumes the sibling's variable
                  //     continue;
                  //   }
                  //   continue;
                  // }

                  // if (isSiblingESQLControl) {
                  //   // Panels that publish an ES|QL query are related to ES|QL controls that publish variables they use
                  //   if (!query) continue;
                  //   const usedVariables = getESQLQueryVariables(query);
                  //   if (usedVariables.includes(sibling.esqlVariable$.value.key)) {
                  //     related.push(siblingUuid);
                  //   }
                  //   continue;
                  // }

                  // if (isFilterControl) {
                  //   // Filter/time controls are related to all siblings in their scope that use global filters
                  //   if (siblingUseGlobalFilters !== false) related.push(siblingUuid);
                  //   continue;
                  // }

                  // if (!isSiblingFilterControl) continue;

                  // // All non-control panels are related to any filter or time-slider control
                  // // in the same scope
                  // related.push(siblingUuid);
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
