/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

export function initializeExpandAndScrollPanels(
  untilEmbeddableLoaded: (id: string) => Promise<unknown>
) {
  const expandedPanelId$ = new BehaviorSubject<string | undefined>(undefined);
  const scrollToPanelId$ = new BehaviorSubject<string | undefined>(undefined);
  let scrollPosition: number | undefined;

  function setScrollToPanelId(id: string | undefined) {
    scrollToPanelId$.next(id);
  }

  return {
    expandedPanelId: expandedPanelId$,
    expandPanel: (panelId: string) => {
      const isPanelExpanded = Boolean(expandedPanelId$.value);

      if (isPanelExpanded) {
        expandedPanelId$.next(undefined);
        setScrollToPanelId(panelId);
        return;
      }

      expandedPanelId$.next(panelId);
      if (window.scrollY > 0) {
        scrollPosition = window.scrollY;
      }
    },
    scrollToPanelId$,
    scrollToPanel: async (panelRef: HTMLDivElement) => {
      const id = scrollToPanelId$.value;
      if (!id) return;

      untilEmbeddableLoaded(id).then(() => {
        setScrollToPanelId(undefined);
        if (scrollPosition) {
          panelRef.ontransitionend = () => {
            // Scroll to the last scroll position after the transition ends to ensure the panel is back in the right position before scrolling
            // This is necessary because when an expanded panel collapses, it takes some time for the panel to return to its original position
            window.scrollTo({ top: scrollPosition });
            scrollPosition = undefined;
            panelRef.ontransitionend = null;
          };
          return;
        }

        panelRef.scrollIntoView({ block: 'center' });
      });
    },
    scrollToTop: () => {
      window.scroll(0, 0);
    },
    setExpandedPanelId: (id: string | undefined) => expandedPanelId$.next(id),
    setScrollToPanelId,
  };
}
