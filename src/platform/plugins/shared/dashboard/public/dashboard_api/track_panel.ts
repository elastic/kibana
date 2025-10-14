/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Subject } from 'rxjs';

export const highlightAnimationDuration = 2000;

export function initializeTrackPanel(
  untilLoaded: (id: string) => Promise<undefined>,
  dashboardContainerRef$: BehaviorSubject<HTMLElement | null>
) {
  const expandedPanelId$ = new BehaviorSubject<string | undefined>(undefined);
  const focusedPanelId$ = new BehaviorSubject<string | undefined>(undefined);
  const highlightPanelId$ = new BehaviorSubject<string | undefined>(undefined);
  const scrollToPanelId$ = new BehaviorSubject<string | undefined>(undefined);
  const scrollToBottom$ = new Subject<void>();
  const scrollPosition$ = new BehaviorSubject<number | undefined>(undefined);

  function setScrollToPanelId(id: string | undefined) {
    if (scrollToPanelId$.value !== id) scrollToPanelId$.next(id);
  }

  function setExpandedPanelId(id: string | undefined) {
    if (expandedPanelId$.value !== id) expandedPanelId$.next(id);
  }

  return {
    expandedPanelId$,
    expandPanel: (panelId: string) => {
      const isPanelExpanded = panelId === expandedPanelId$.value;

      if (isPanelExpanded) {
        setExpandedPanelId(undefined);
        setScrollToPanelId(panelId);
        return;
      }

      setExpandedPanelId(panelId);
      scrollPosition$.next(window.scrollY);
    },
    focusedPanelId$,
    highlightPanelId$,
    highlightPanel: (panelRef: HTMLDivElement) => {
      const id = highlightPanelId$.value;
      if (!id) return;

      untilLoaded(id).then(() => {
        // Adds the highlight class in the next event loop to allow the DOM to update
        setTimeout(() => panelRef.classList.add('dshDashboardGrid__item--highlighted'), 0);
        // Removes the class after the highlight animation finishes
        setTimeout(() => {
          panelRef.classList.remove('dshDashboardGrid__item--highlighted');
        }, highlightAnimationDuration);
      });

      highlightPanelId$.next(undefined);
    },
    scrollToPanelId$,
    scrollToPanel: async (panelRef: HTMLDivElement) => {
      const id = scrollToPanelId$.value;
      if (!id) return;

      untilLoaded(id).then(() => {
        if (scrollPosition$.value !== undefined) {
          window.scrollTo({ top: scrollPosition$.value, behavior: 'smooth' });
          scrollPosition$.next(undefined);
        } else {
          const dashboardTop = dashboardContainerRef$.value?.getBoundingClientRect().top || 0;
          const clientBottom = window.innerHeight;
          const { top: panelTop, bottom: panelBottom } = panelRef.getBoundingClientRect();

          // only scroll if panel is not fully visible within the current viewport
          if (panelTop < dashboardTop || panelBottom > clientBottom) {
            panelRef.scrollIntoView({ block: 'start', behavior: 'smooth' });
          }
        }

        setScrollToPanelId(undefined);
      });
    },
    scrollPosition$,
    scrollToTop: () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    scrollToBottom$,
    scrollToBottom: () => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    },
    setFocusedPanelId: (id: string | undefined) => {
      if (focusedPanelId$.value !== id) focusedPanelId$.next(id);
      setScrollToPanelId(id);
    },
    setHighlightPanelId: (id: string | undefined) => {
      if (highlightPanelId$.value !== id) highlightPanelId$.next(id);
    },
    setScrollToPanelId,
  };
}
