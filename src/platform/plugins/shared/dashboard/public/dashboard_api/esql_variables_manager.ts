/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import { BehaviorSubject, combineLatest, map, switchMap } from 'rxjs';
import { apiPublishesESQLVariable, type ESQLControlVariable } from '@kbn/esql-types';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { AggregateQuery } from '@kbn/es-query';
import { getESQLQueryVariables } from '@kbn/esql-utils';

export const initializeESQLVariablesManager = (
  children$: PublishingSubject<{ [key: string]: DefaultEmbeddableApi }>
) => {
  const esqlVariables$ = new BehaviorSubject<ESQLControlVariable[]>([]);
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
      esqlVariables$.next(esqlVariablesWithUUIDs.map(({ variable }) => variable));

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

  return {
    api: {
      esqlVariables$,
    },
    internalApi: {
      esqlRelatedPanels$,
    },
    cleanup: () => {
      childrenESQLVariablesSubscription.unsubscribe();
    },
  };
};

interface PublishesESQLQuery {
  query$: PublishingSubject<AggregateQuery>;
}
const apiPublishesESQLQuery = (api: unknown): api is PublishesESQLQuery =>
  Boolean((api as PublishesESQLQuery).query$) &&
  'esql' in (api as PublishesESQLQuery).query$?.value;
