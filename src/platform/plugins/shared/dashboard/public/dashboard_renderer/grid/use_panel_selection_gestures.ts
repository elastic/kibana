/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { useEffect, useState } from 'react';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import { isSelectionModifier } from './selection_modifier';

export interface SelectionRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

type PanelRefs = React.MutableRefObject<{ [panelId: string]: React.Ref<HTMLDivElement> }>;

// Mouse movement (in px) after a modifier mousedown beyond which the gesture is a rectangle selection, not a click
const MARQUEE_THRESHOLD_PX = 4;

/**
 * Elements whose own modifier-click behaviour must be preserved (open link in a new tab, range-select
 * table rows, hover actions with an href, menus and flyouts rendered in portals).
 */
const IGNORED_TARGET_SELECTOR = [
  '.embPanel__hoverActions',
  '[data-euiportal]',
  'a[href]',
  'button',
  'input',
  '[role="checkbox"]',
  '[role="button"]',
].join(', ');

/** Clicks on these elements never clear the current selection */
const KEEP_SELECTION_SELECTOR = [
  '[data-euiportal]',
  '[data-test-subj="dashboardSelectedPanelsToolbar"]',
  '.embPanel--selectPanel',
].join(', ');

const toRect = (a: { x: number; y: number }, b: { x: number; y: number }): SelectionRect => ({
  left: Math.min(a.x, b.x),
  top: Math.min(a.y, b.y),
  right: Math.max(a.x, b.x),
  bottom: Math.max(a.y, b.y),
});

const intersects = (a: SelectionRect, b: DOMRect) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

const getPanelElement = (ref: React.Ref<HTMLDivElement>): HTMLDivElement | null =>
  typeof ref === 'function' || !ref ? null : ref.current;

/**
 * Handles the mouse gestures used to select dashboard panels:
 * - modifier + click anywhere on a panel toggles it, without the panel content reacting to the click
 * - modifier + drag draws a rectangle and adds every panel it touches to the selection
 * - a plain click outside the selected panels clears the selection
 * Returns the rectangle currently being drawn, if any, so the caller can render it.
 */
export const usePanelSelectionGestures = ({
  layoutRef,
  panelRefs,
  enabled,
}: {
  layoutRef: React.RefObject<HTMLDivElement>;
  panelRefs: PanelRefs;
  enabled: boolean;
}): SelectionRect | undefined => {
  const dashboardApi = useDashboardApi();
  const [marqueeRect, setMarqueeRect] = useState<SelectionRect | undefined>();

  useEffect(() => {
    const root = layoutRef.current;
    if (!root || !enabled) return;

    const findPanelId = (target: EventTarget | null): string | undefined => {
      if (!(target instanceof Node)) return;
      return Object.entries(panelRefs.current).find(([, ref]) =>
        getPanelElement(ref)?.contains(target)
      )?.[0];
    };

    // The click that follows a modifier gesture must not reach the panel content (filters, drilldowns, links)
    let suppressNextClick = false;

    const onDocumentMouseDown = () => {
      suppressNextClick = false;
    };

    const onDocumentClick = (e: MouseEvent) => {
      if (suppressNextClick) {
        suppressNextClick = false;
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      if (isSelectionModifier(e)) return; // modifier clicks are selection gestures, never "click outside"
      if (!dashboardApi.selectedPanelIds$.value.length) return;

      const target = e.target as HTMLElement;
      if (target.closest(KEEP_SELECTION_SELECTOR)) return;
      const panelId = findPanelId(target);
      if (panelId && dashboardApi.selectedPanelIds$.value.includes(panelId)) return;
      dashboardApi.clearPanelSelection();
    };

    const onRootMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 || !isSelectionModifier(e)) return;
      const target = e.target as HTMLElement;
      if (target.closest(IGNORED_TARGET_SELECTOR)) return;

      e.preventDefault(); // no text selection or native drag
      e.stopPropagation(); // charts, maps and the grid drag handles never see this mousedown

      const start = { x: e.clientX, y: e.clientY };
      const startPanelId = findPanelId(target);
      let isMarquee = false;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const current = { x: moveEvent.clientX, y: moveEvent.clientY };
        if (
          !isMarquee &&
          (Math.abs(current.x - start.x) > MARQUEE_THRESHOLD_PX ||
            Math.abs(current.y - start.y) > MARQUEE_THRESHOLD_PX)
        ) {
          isMarquee = true;
        }
        if (isMarquee) setMarqueeRect(toRect(start, current));
      };

      const onMouseUp = (upEvent: MouseEvent) => {
        document.removeEventListener('mousemove', onMouseMove);
        suppressNextClick = true;

        if (!isMarquee) {
          if (startPanelId) dashboardApi.togglePanelSelection(startPanelId);
          return;
        }

        const rect = toRect(start, { x: upEvent.clientX, y: upEvent.clientY });
        const intersectingPanelIds = Object.entries(panelRefs.current)
          .filter(([, ref]) => {
            const element = getPanelElement(ref);
            return element ? intersects(rect, element.getBoundingClientRect()) : false;
          })
          .map(([panelId]) => panelId);
        dashboardApi.addPanelsToSelection(intersectingPanelIds);
        setMarqueeRect(undefined);
      };

      document.addEventListener('mousemove', onMouseMove, { passive: true });
      document.addEventListener('mouseup', onMouseUp, { once: true });
    };

    root.addEventListener('mousedown', onRootMouseDown, { capture: true });
    document.addEventListener('mousedown', onDocumentMouseDown, { capture: true });
    document.addEventListener('click', onDocumentClick, { capture: true });
    return () => {
      root.removeEventListener('mousedown', onRootMouseDown, { capture: true });
      document.removeEventListener('mousedown', onDocumentMouseDown, { capture: true });
      document.removeEventListener('click', onDocumentClick, { capture: true });
      setMarqueeRect(undefined);
    };
  }, [layoutRef, panelRefs, enabled, dashboardApi]);

  return marqueeRect;
};
