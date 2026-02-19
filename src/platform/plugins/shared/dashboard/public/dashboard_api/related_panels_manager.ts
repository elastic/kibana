/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { PublishingSubject } from '@kbn/presentation-publishing';
import { apiAppliesFilters, apiHasUseGlobalFiltersSetting } from '@kbn/presentation-publishing';
import type { Observable } from 'rxjs';
import { BehaviorSubject, combineLatest, filter, map, of, switchMap } from 'rxjs';
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

  /**
   * Iterate through the current children$ and pipe them to a stream of:
   * - Which child UUIDs apply filters and which are only affected by filters, grouped by sectionID
   * - Which child UUIDs publish ES|QL variables, and which ones publish ES|QL queries that may be affected
   *   by these variables
   */
  const childUUIDsIndexed$ = combineLatest([
    children$,
    focusedPanelId$,
    layout$, // Update on layout change to get the most recent sectionIds
  ]).pipe(
    // Skip calculations if there is no focused panel
    filter(([_, focusedPanelId]) => Boolean(focusedPanelId)),
    switchMap(([children]) => {
      const childrenBySectionAndFilterApplication = new Map<string | Symbol, SectionFilterEntry>();
      const uuidsUsingGlobalFilters = new Set<string>();

      const esqlVariableChildrenByUUID: Array<
        Observable<{ uuid: string; variable: ESQLControlVariable }>
      > = [];
      const esqlQueryChildrenByUUID: Array<Observable<{ uuid: string; esql: string }>> = [];

      for (const child of Object.values(children)) {
        // Group all panels by section ID based on whether or not they apply filters
        const layoutPanel = getDashboardPanelFromId(child.uuid);

        const sectionId = layoutPanel.grid.sectionId ?? GLOBAL;
        const nextSectionEntry =
          childrenBySectionAndFilterApplication.get(sectionId) ?? getBlankSectionFilterEntry();

        if (apiAppliesFilters(child)) {
          nextSectionEntry.appliesFilters.add(child.uuid);
          if (apiHasUseGlobalFiltersSetting(child) && child.useGlobalFilters$.value)
            uuidsUsingGlobalFilters.add(child.uuid);
        } else {
          nextSectionEntry.doesNotApplyFilters.add(child.uuid);
        }
        childrenBySectionAndFilterApplication.set(sectionId, nextSectionEntry);

        // Determine which panels publish ES|QL variables or queries
        if (apiPublishesESQLQuery(child)) {
          esqlQueryChildrenByUUID.push(
            child.query$.pipe(map(({ esql }) => ({ esql, uuid: child.uuid })))
          );
        } else if (apiPublishesESQLVariable(child)) {
          esqlVariableChildrenByUUID.push(
            child.esqlVariable$.pipe(map((variable) => ({ variable, uuid: child.uuid })))
          );
        }
      }

      return combineLatest([
        of(
          getRelatedPanelsByAppliedFilters({
            childrenBySectionAndFilterApplication,
            uuidsUsingGlobalFilters,
          })
        ),
        esqlVariableChildrenByUUID.length
          ? combineLatest(esqlVariableChildrenByUUID)
          : of(undefined),
        esqlQueryChildrenByUUID.length ? combineLatest(esqlQueryChildrenByUUID) : of(undefined),
      ]);
    })
  );

  const relatedPanelSubscription = childUUIDsIndexed$.subscribe(
    ([filterRelatedPanels, esqlVariablesWithUUIDs, esqlQueriesWithUUIDs]) => {
      const esqlRelatedPanels = getRelatedPanelsByESQL({
        esqlVariablesWithUUIDs,
        esqlQueriesWithUUIDs,
      });
      arePanelsRelated$.next((a: string, b: string) => {
        const relatedPanelUUIDs = new Set([
          ...(filterRelatedPanels.get(b) ?? []),
          ...(esqlRelatedPanels.get(b) ?? []),
        ]);
        return relatedPanelUUIDs.has(a);
      });
    }
  );

  return {
    api: {
      arePanelsRelated$,
    },
    cleanup: () => {
      relatedPanelSubscription.unsubscribe();
    },
  };
};

function getRelatedPanelsByAppliedFilters({
  childrenBySectionAndFilterApplication,
  uuidsUsingGlobalFilters,
}: {
  childrenBySectionAndFilterApplication: Map<string | Symbol, SectionFilterEntry>;
  uuidsUsingGlobalFilters: Set<string>;
}) {
  const filterRelatedPanels = new Map<string, string[]>();

  const { appliesFilters: globalAppliesFilters } =
    childrenBySectionAndFilterApplication.get(GLOBAL) ?? getBlankSectionFilterEntry();

  for (const [
    sectionId,
    { appliesFilters, doesNotApplyFilters },
  ] of childrenBySectionAndFilterApplication.entries()) {
    for (const uuid of appliesFilters) {
      const relatedPanels = [
        // Apply global panels to everything; apply others only to panels in the same section
        ...(sectionId === GLOBAL
          ? childrenBySectionAndFilterApplication
              .values()
              .flatMap((section) => section.doesNotApplyFilters)
          : [...doesNotApplyFilters]),
        // If this panel uses global filters, other filter-applying panels should be `related`
        // to this panel as well
        ...(uuidsUsingGlobalFilters.has(uuid)
          ? [
              ...Array.from(appliesFilters).filter((id) => id !== uuid),
              ...(sectionId === GLOBAL ? [] : [...globalAppliesFilters]),
            ]
          : []),
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
}

function getRelatedPanelsByESQL({
  esqlVariablesWithUUIDs,
  esqlQueriesWithUUIDs,
}: {
  esqlVariablesWithUUIDs?: Array<{ uuid: string; variable: ESQLControlVariable }>;
  esqlQueriesWithUUIDs?: Array<{ uuid: string; esql: string }>;
}) {
  const nextESQLRelatedPanels: Map<string, string[]> = new Map();
  if (!esqlVariablesWithUUIDs || !esqlQueriesWithUUIDs) return nextESQLRelatedPanels;

  // For each panel with an ES|QL query, check if it has any variables, then create a map of which
  // panels publish these corresponding variables
  for (const { esql, uuid } of esqlQueriesWithUUIDs) {
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
}
