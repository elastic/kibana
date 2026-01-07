/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { PublishingSubject } from '@kbn/presentation-publishing';
import { apiAppliesFilters } from '@kbn/presentation-publishing';
import type { Observable } from 'rxjs';
import { BehaviorSubject, combineLatest, filter, map, switchMap } from 'rxjs';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { apiPublishesESQLVariable } from '@kbn/esql-types';
import { getESQLQueryVariables } from '@kbn/esql-utils';
import type { AggregateQuery } from '@kbn/es-query';
import type { initializeLayoutManager } from './layout_manager';
import type { initializeTrackPanel } from './track_panel';

const GLOBAL = Symbol('GLOBAL');

interface SectionFilterEntry {
  appliesFilters: Set<string>;
  doesNotApplyFilters: Set<string>;
}
const getBlankSectionFilterEntry = () =>
  ({
    appliesFilters: new Set(),
    doesNotApplyFilters: new Set(),
  } as SectionFilterEntry);

interface PublishesESQLQuery {
  query$: PublishingSubject<AggregateQuery>;
}
const apiPublishesESQLQuery = (api: unknown): api is PublishesESQLQuery =>
  Boolean((api as PublishesESQLQuery).query$) &&
  'esql' in (api as PublishesESQLQuery).query$?.value;

export const initializeRelatedPanelsManager = (
  trackPanel: ReturnType<typeof initializeTrackPanel>,
  layoutManager: ReturnType<typeof initializeLayoutManager>
) => {
  const { focusedPanelId$ } = trackPanel;
  const { children$, layout$, getDashboardPanelFromId } = layoutManager.api;
  const arePanelsRelated$ = new BehaviorSubject<(a: string, b: string) => boolean>(() => false);

  const filterRelatedPanels$ = combineLatest(
    // Update on layout change to get the most recent sectionIds
    [children$, focusedPanelId$, layout$]
  ).pipe(
    // Skip calculations if there is no focused panel
    filter(([_, focusedPanelId]) => Boolean(focusedPanelId)),
    map(([children]) => {
      const childrenBySectionAndFilterApplication = new Map<string | Symbol, SectionFilterEntry>();

      for (const child of Object.values(children)) {
        const layoutPanel = getDashboardPanelFromId(child.uuid);
        if (!layoutPanel) continue;

        const sectionId = layoutPanel.grid.sectionId ?? GLOBAL;
        const nextSectionEntry =
          childrenBySectionAndFilterApplication.get(sectionId) ?? getBlankSectionFilterEntry();

        if (apiAppliesFilters(child)) {
          nextSectionEntry.appliesFilters.add(child.uuid);
        } else {
          nextSectionEntry.doesNotApplyFilters.add(child.uuid);
        }

        childrenBySectionAndFilterApplication.set(sectionId, nextSectionEntry);
      }

      const filterRelatedPanels = new Map<string, string[]>();

      const { appliesFilters: globalAppliesFilters } =
        childrenBySectionAndFilterApplication.get(GLOBAL) ?? getBlankSectionFilterEntry();

      for (const [
        sectionId,
        { appliesFilters, doesNotApplyFilters },
      ] of childrenBySectionAndFilterApplication.entries()) {
        for (const uuid of appliesFilters) {
          const relatedPanels = [
            // Other filter-applying panels should be `related` to this panel as well
            // TODO: Make this only true if useGlobalFilters is true
            ...Array.from(appliesFilters).filter((id) => id !== uuid),
            ...doesNotApplyFilters,
            ...(sectionId === GLOBAL ? [] : [...globalAppliesFilters]),
          ];
          filterRelatedPanels.set(uuid, relatedPanels);
        }

        for (const uuid of doesNotApplyFilters) {
          const relatedPanels = [
            ...Array.from(appliesFilters).filter((id) => id !== uuid),
            ...(sectionId === GLOBAL ? [] : [...globalAppliesFilters]),
          ];

          filterRelatedPanels.set(uuid, relatedPanels);
        }
      }

      return filterRelatedPanels;
    })
  );

  const esqlRelatedPanels$ = combineLatest([children$, focusedPanelId$]).pipe(
    // Skip calculations if there is no focused panel
    filter(([_, focusedPanelId]) => Boolean(focusedPanelId)),
    switchMap(([children]) => {
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

      return combineLatest([combineLatest(esqlVariableChildren), combineLatest(esqlQueryChildren)]);
    }),
    map(([esqlVariablesWithUUIDs, esqlQueries]) => {
      const nextESQLRelatedPanels: Map<string, string[]> = new Map();

      // For each panel with an ES|QL query, check if it has any variables, then create a map of which
      // panels publish these corresponding variables
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
      return nextESQLRelatedPanels;
    })
  );

  const relatedPanelSubscription = combineLatest([
    filterRelatedPanels$,
    esqlRelatedPanels$,
  ]).subscribe(([filterRelatedPanels, esqlRelatedPanels]) => {
    arePanelsRelated$.next((a: string, b: string) => {
      const relatedPanelUUIDs = new Set([
        ...(filterRelatedPanels.get(b) ?? []),
        ...(esqlRelatedPanels.get(b) ?? []),
      ]);
      return relatedPanelUUIDs.has(a);
    });
  });

  return {
    api: {
      arePanelsRelated$,
    },
    cleanup: () => {
      relatedPanelSubscription.unsubscribe();
    },
  };
};
