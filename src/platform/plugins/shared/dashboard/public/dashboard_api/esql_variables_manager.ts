/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';

import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { Observable } from 'rxjs';
import { apiPublishesESQLVariable, type ESQLControlVariable } from '@kbn/esql-types';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import {
  BehaviorSubject,
  combineLatest,
  combineLatestWith,
  filter,
  first,
  map,
  skip,
  type Subject,
  switchMap,
} from 'rxjs';
import { getESQLQueryVariables } from '@kbn/esql-utils';
import type { AggregateQuery } from '@kbn/es-query';
import type { initializeSettingsManager } from './settings_manager';

export const initializeESQLVariablesManager = (
  children$: PublishingSubject<{ [key: string]: DefaultEmbeddableApi }>,
  settingsManager: ReturnType<typeof initializeSettingsManager>,
  forcePublish$: Subject<void>
) => {
  const publishedEsqlVariables$ = new BehaviorSubject<ESQLControlVariable[]>([]);
  const unpublishedEsqlVariables$ = new BehaviorSubject<ESQLControlVariable[]>([]);
  const esqlRelatedPanels$ = new BehaviorSubject<Map<string, string[]>>(new Map());

  const childrenESQLVariablesSubscription = children$
    .pipe(
      switchMap((children) => {
        const esqlVariableChildren: Array<
          Observable<{ uuid: string; variable: ESQLControlVariable }>
        > = [];
        const esqlQueryChildren: Array<Observable<{ uuid: string; esql: string }>> = [];

        for (const child of Object.values(children)) {
          if (apiPublishesESQLQuery(child)) {
            esqlQueryChildren.push(
              child.query$.pipe(map(({ esql }) => ({ esql, uuid: child.uuid })))
            );
          } else if (apiPublishesESQLVariable(child)) {
            esqlVariableChildren.push(
              child.esqlVariable$.pipe(map((variable) => ({ variable, uuid: child.uuid })))
            );
          }
        }

        return combineLatest([
          combineLatest(esqlVariableChildren),
          combineLatest(esqlQueryChildren),
        ]);
      })
    )
    .subscribe(([esqlVariablesWithUUIDs, esqlQueries]) => {
      unpublishedEsqlVariables$.next(esqlVariablesWithUUIDs.map(({ variable }) => variable));

      const nextESQLRelatedPanels: Map<string, string[]> = new Map();
      for (const { esql, uuid } of esqlQueries) {
        const variables = getESQLQueryVariables(esql);
        if (variables.length > 0) {
          const relatedPanelUUIDs = variables
            .map(
              (variableName) =>
                esqlVariablesWithUUIDs.find(({ variable: { key } }) => key === variableName)?.uuid
            )
            .filter(Boolean) as string[];
          nextESQLRelatedPanels.set(uuid, relatedPanelUUIDs);

          for (const relatedUUID of relatedPanelUUIDs) {
            nextESQLRelatedPanels.set(relatedUUID, [
              ...(nextESQLRelatedPanels.get(relatedUUID) ?? []),
              uuid,
            ]);
          }
        }
      }
      esqlRelatedPanels$.next(nextESQLRelatedPanels);
    });

  const publishVariables = () => {
    const published = publishedEsqlVariables$.getValue();
    const unpublished = unpublishedEsqlVariables$.getValue();
    if (!deepEqual(published, unpublished)) {
      publishedEsqlVariables$.next(unpublished);
    }
  };

  /** when auto publish is `true`, push filters from `unpublishedFilters$` directly to published */
  const autoPublishFiltersSubscription = unpublishedEsqlVariables$
    .pipe(
      combineLatestWith(settingsManager.api.settings.autoApplyFilters$),
      filter(([_, autoApplyFilters]) => autoApplyFilters)
    )
    .subscribe(([filters, autoApplyFilters]) => {
      publishVariables();
    });

  /** when auto-apply is `false`, publish the first set of variables once the children are available */
  if (!settingsManager.api.settings.autoApplyFilters$.getValue()) {
    unpublishedEsqlVariables$.pipe(skip(1), first()).subscribe(() => {
      publishVariables();
    });
  }

  /** when auto-apply is `false` and the dashboard is reset, wait for new filters to be updated and publish them */
  const forcePublishSubscription = forcePublish$
    .pipe(
      switchMap(async () => {
        await new Promise((resolve) => {
          unpublishedEsqlVariables$.pipe(first()).subscribe(resolve);
        });
      })
    )
    .subscribe(() => {
      publishVariables();
    });

  return {
    api: {
      publishedEsqlVariables$,
      unpublishedEsqlVariables$,
      publishVariables,
    },
    internalApi: {
      esqlRelatedPanels$,
    },
    cleanup: () => {
      childrenESQLVariablesSubscription.unsubscribe();
      autoPublishFiltersSubscription.unsubscribe();
      forcePublishSubscription.unsubscribe();
    },
  };
};

interface PublishesESQLQuery {
  query$: PublishingSubject<AggregateQuery>;
}
const apiPublishesESQLQuery = (api: unknown): api is PublishesESQLQuery =>
  Boolean((api as PublishesESQLQuery).query$) &&
  'esql' in (api as PublishesESQLQuery).query$?.value;
