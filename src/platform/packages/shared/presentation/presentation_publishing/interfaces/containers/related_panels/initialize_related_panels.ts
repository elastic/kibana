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
  switchMap,
  take,
  takeUntil,
  type Observable,
} from 'rxjs';

import { Parser, Walker } from '@elastic/esql';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { apiPublishesESQLVariable } from '@kbn/esql-types';
import type { AggregateQuery } from '@kbn/es-query';
import { apiHasSections, apiPublishesChildren } from '../presentation_container';
import {
  apiAppliesFilters,
  apiAppliesTimeslice,
  apiHasUseGlobalFiltersSetting,
} from '../../fetch/applies_filters';
import { apiPublishesESQLQuery } from '../../publishes_esql_query';
import type { ViewMode } from '../../publishes_view_mode';
import { apiPublishesViewMode } from '../../publishes_view_mode';
import type { PublishingSubject } from '../../../publishing_subject';

// Redeclare instead of importing from `@kbn/esql-utils` to avoid circular dependency issues
const getESQLQueryVariables = (esql: string): string[] => {
  const { root } = Parser.parse(esql);
  return Walker.params(root).map((v) => v.text.replace(/^\?+/, ''));
};

interface BaseProps {
  uuid: string;
  parentApi: unknown;
  isFilterControl?: boolean;
  esqlQuery$?: PublishingSubject<AggregateQuery>;
}

type ESQLControlProps = BaseProps & {
  isESQLControl: true;
  esqlVariable$: PublishingSubject<ESQLControlVariable>;
};

type NonESQLControlProps = BaseProps & {
  isESQLControl?: never;
  esqlVariable$?: never;
};

/**
 * Initializes `relatedPanels$` for an embeddable based on its role in the dashboard
 * (or any sibling-aware container):
 */
export const initializeRelatedPanels = ({
  uuid,
  parentApi,
  isFilterControl,
  isESQLControl,
  esqlQuery$,
  esqlVariable$,
}: ESQLControlProps | NonESQLControlProps): { relatedPanels$: BehaviorSubject<string[]> } => {
  const relatedPanels$ = new BehaviorSubject<string[]>([]);

  if (!apiPublishesChildren(parentApi)) {
    return { relatedPanels$ };
  }

  const childrenApi = parentApi;
  const section$ = apiHasSections(parentApi) ? parentApi.panelSection$(uuid) : of(undefined);
  const viewMode$: Observable<ViewMode> = apiPublishesViewMode(parentApi)
    ? parentApi.viewMode$
    : of('view' as ViewMode);

  const query$: Observable<string | undefined> =
    esqlQuery$?.pipe(map((query) => query?.esql)) ?? of(undefined);

  const teardown$ = childrenApi.children$.pipe(
    pairwise(),
    filter(([prev, curr]) => uuid in prev && !(uuid in curr)),
    take(1)
  );

  viewMode$
    .pipe(
      distinctUntilChanged(),
      switchMap((viewMode) => {
        if (viewMode !== 'edit') return of<string[]>([]);

        return combineLatest([childrenApi.children$, section$, query$]).pipe(
          switchMap(([children, section, query]) => {
            const siblingEntries = Object.entries(children).filter(
              ([siblingUuid]) => siblingUuid !== uuid
            );
            if (siblingEntries.length === 0) return of<string[]>([]);

            const siblingObservables = siblingEntries.map(([siblingUuid, sibling]) => {
              const siblingSection$: Observable<string | undefined> = apiHasSections(parentApi)
                ? parentApi.panelSection$(siblingUuid)
                : of(undefined);
              const siblingQuery$: Observable<string | undefined> = apiPublishesESQLQuery(sibling)
                ? sibling.query$.pipe(map((q) => q?.esql))
                : of(undefined);
              const siblingUseGlobalFilters$: Observable<boolean | undefined> =
                apiHasUseGlobalFiltersSetting(sibling) ? sibling.useGlobalFilters$ : of(undefined);
              return combineLatest([siblingSection$, siblingQuery$, siblingUseGlobalFilters$]).pipe(
                map(([siblingSection, siblingESQL, siblingUseGlobalFilters]) => ({
                  uuid: siblingUuid,
                  sibling,
                  section: siblingSection,
                  esql: siblingESQL,
                  useGlobalFilters: siblingUseGlobalFilters,
                }))
              );
            });

            return combineLatest(siblingObservables).pipe(
              map((siblings) => {
                const related: string[] = [];
                for (const {
                  uuid: siblingUuid,
                  sibling,
                  section: siblingSection,
                  esql: siblingESQL,
                  useGlobalFilters: siblingUseGlobalFilters,
                } of siblings) {
                  const isSiblingFilterControl =
                    apiAppliesFilters(sibling) || apiAppliesTimeslice(sibling);
                  const isSiblingESQLControl = apiPublishesESQLVariable(sibling);
                  const compatibleScope =
                    section === siblingSection ||
                    (section === undefined && (isESQLControl || isFilterControl)) ||
                    (siblingSection === undefined &&
                      (isSiblingFilterControl || isSiblingESQLControl));
                  if (!compatibleScope) continue;

                  if (isESQLControl) {
                    const siblingUsesESQLVariable =
                      siblingESQL &&
                      getESQLQueryVariables(siblingESQL).includes(esqlVariable$.value.key);

                    if (siblingUsesESQLVariable) {
                      // If a sibling uses this control's ES|QL variable, it's related
                      related.push(siblingUuid);
                      continue;
                    } else if (!isSiblingESQLControl) {
                      // If the sibling does not use this ES|QL control's variable, only bail out if the sibling is not
                      // also an ES|QL control. Otherwise, continue on to check if this control consumes the sibling's variable
                      continue;
                    }
                    continue;
                  }

                  if (isSiblingESQLControl) {
                    // Panels that publish an ES|QL query are related to ES|QL controls that publish variables they use
                    if (!query) continue;
                    const usedVariables = getESQLQueryVariables(query);
                    if (usedVariables.includes(sibling.esqlVariable$.value.key)) {
                      related.push(siblingUuid);
                    }
                    continue;
                  }

                  if (isFilterControl) {
                    // Filter/time controls are related to all siblings in their scope that use global filters
                    if (siblingUseGlobalFilters !== false) related.push(siblingUuid);
                    continue;
                  }

                  if (!isSiblingFilterControl) continue;

                  // All non-control panels are related to any filter or time-slider control
                  // in the same scope
                  related.push(siblingUuid);
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
