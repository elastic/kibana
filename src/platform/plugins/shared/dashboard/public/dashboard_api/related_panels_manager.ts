/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { apiAppliesFilters } from '@kbn/presentation-publishing';
import { BehaviorSubject, combineLatest, map, switchMap } from 'rxjs';
import type { initializeESQLVariablesManager } from './esql_variables_manager';
import type { initializeLayoutManager } from './layout_manager';

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

export const initializeRelatedPanelsManager = (
  layoutManager: ReturnType<typeof initializeLayoutManager>,
  esqlVariablesManager: ReturnType<typeof initializeESQLVariablesManager>
) => {
  const { children$, getDashboardPanelFromId } = layoutManager.api;
  const arePanelsRelated$ = new BehaviorSubject<(a: string, b: string) => boolean>(() => false);
  const filterRelatedPanels$ = children$.pipe(
    map((children) => {
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

  const relatedPanelSubscription = combineLatest([
    filterRelatedPanels$,
    esqlVariablesManager.internalApi.esqlRelatedPanels$,
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
