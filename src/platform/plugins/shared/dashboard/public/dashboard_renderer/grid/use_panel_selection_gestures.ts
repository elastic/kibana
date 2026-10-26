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
import { getScrollContainer, getScrollPosition } from '@kbn/core-chrome-layout-utils';
import { handleAutoscroll, startAutoScroll, stopAutoScroll } from '@kbn/grid-layout';
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
  '.embPanel__selectPanel',
  '[data-euiportal]',
  'a[href]',
  'button',
  'input',
  '[role="checkbox"]',
  '[role="button"]',
].join(', ');

/**
 * In selection mode (at least one panel selected) every click inside the grid is a selection gesture,
 * except on the checkbox itself and on content rendered in portals.
 */
const SELECTION_MODE_IGNORED_TARGET_SELECTOR = [
  '.embPanel__hoverActions',
  '.embPanel__selectPanel',
  '[data-euiportal]',
].join(', ');

/** Clicks on these elements never clear the current selection */
const KEEP_SELECTION_SELECTOR = [
  '[data-euiportal]',
  '[data-test-subj="dashboardSelectedPanelsToolbar"]',
  '.embPanel__selectPanel',
].join(', ');

/**
 * The parts of a panel used to drag it: everything the grid registered as a drag handle (the title and
 * the move icon in the hover actions) plus the rest of the header strip around the title.
 */
const DRAG_AREA_SELECTOR = ['.kbnGridPanel--dragHandle', '.embPanel__header'].join(', ');

/**
 * Controls inside the drag area that do something on click (title link to the customize flyout,
 * badges, menus in portals). The move icon is a button too but it is the drag handle itself.
 */
const DRAG_AREA_INTERACTIVE_SELECTOR = [
  'a',
  'button:not(.embPanel--dragHandle)',
  'input',
  '[role="button"]',
  '[role="link"]',
  '[data-euiportal]',
].join(', ');

const SELECT_HINT_DURATION_MS = 2000;

/**
 * Applied directly to the grid items touched by the rectangle while it is being drawn, so they are
 * outlined like selected panels without re-rendering the grid on every mouse move (the grid layout
 * uses the same approach for its `kbnGridPanel--active` class).
 */
export const MARQUEE_PREVIEW_CLASS = 'dshDashboardGrid__item--marqueePreview';

/** Escape pressed while focus is here belongs to that element (close a menu / flyout, leave an input) */
const ESCAPE_OWNED_BY_TARGET_SELECTOR = [
  '[data-euiportal]',
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
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
 * - once at least one panel is selected (selection mode), plain clicks and drags inside the grid behave
 *   the same way, so panels act as selection items and their content does not react
 * - a plain click outside the selected panels, or pressing Escape, clears the selection
 * - a plain click on a panel's drag area (title bar or move icon) that does not become a drag briefly
 *   shows a "how to select" hint on that panel
 * Returns the rectangle currently being drawn and the panel rectangle to show the hint on, if any.
 */
export const usePanelSelectionGestures = ({
  layoutRef,
  panelRefs,
  enabled,
}: {
  layoutRef: React.RefObject<HTMLDivElement>;
  panelRefs: PanelRefs;
  enabled: boolean;
}): { marqueeRect: SelectionRect | undefined; selectHintRect: SelectionRect | undefined } => {
  const dashboardApi = useDashboardApi();
  const [marqueeRect, setMarqueeRect] = useState<SelectionRect | undefined>();
  const [selectHintRect, setSelectHintRect] = useState<SelectionRect | undefined>();

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

    const getPanelsIntersecting = (rect: SelectionRect): string[] =>
      Object.entries(panelRefs.current)
        .filter(([, ref]) => {
          const element = getPanelElement(ref);
          return element ? intersects(rect, element.getBoundingClientRect()) : false;
        })
        .map(([panelId]) => panelId);

    const setMarqueePreview = (previewPanelIds: string[]) => {
      Object.entries(panelRefs.current).forEach(([panelId, ref]) => {
        getPanelElement(ref)?.classList.toggle(
          MARQUEE_PREVIEW_CLASS,
          previewPanelIds.includes(panelId)
        );
      });
    };

    let hideHintTimeout: ReturnType<typeof setTimeout> | undefined;
    const hideSelectHint = () => {
      if (hideHintTimeout) clearTimeout(hideHintTimeout);
      hideHintTimeout = undefined;
      setSelectHintRect(undefined);
    };
    const showSelectHint = (panelId: string) => {
      const element = getPanelElement(panelRefs.current[panelId]);
      if (!element) return;
      const { left, top, right, bottom } = element.getBoundingClientRect();
      if (hideHintTimeout) clearTimeout(hideHintTimeout);
      setSelectHintRect({ left, top, right, bottom });
      hideHintTimeout = setTimeout(hideSelectHint, SELECT_HINT_DURATION_MS);
    };

    // Where the last mousedown happened, to tell a click on a drag handle apart from a (tiny) drag
    let lastMouseDown: { x: number; y: number } | undefined;

    const onDocumentMouseDown = (e: MouseEvent) => {
      suppressNextClick = false;
      lastMouseDown = { x: e.clientX, y: e.clientY };
      hideSelectHint();
    };

    // Bubble phase on the document: the click has already passed through the whole panel without
    // being stopped. A click on the drag area that did not turn into a drag does nothing, so it is the
    // moment to teach the selection gesture.
    const onDocumentClickBubbled = (e: MouseEvent) => {
      if (e.button !== 0 || e.defaultPrevented || isSelectionModifier(e)) return;
      if (dashboardApi.selectedPanelIds$.value.length) return; // in selection mode clicks select
      const target = e.target as HTMLElement;
      const panelId = findPanelId(target);
      if (!panelId) return;
      if (!target.closest(DRAG_AREA_SELECTOR)) return;
      if (target.closest(DRAG_AREA_INTERACTIVE_SELECTOR)) return;
      const didDrag =
        lastMouseDown &&
        (Math.abs(e.clientX - lastMouseDown.x) > MARQUEE_THRESHOLD_PX ||
          Math.abs(e.clientY - lastMouseDown.y) > MARQUEE_THRESHOLD_PX);
      if (didDrag) return;
      showSelectHint(panelId);
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
      dashboardApi.clearSelectedPanels();
    };

    const onDocumentKeyDown = (e: KeyboardEvent) => {
      if (!isSelectionModifier(e)) hideSelectHint(); // pressing the modifier itself keeps the hint around
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (!dashboardApi.selectedPanelIds$.value.length) return;
      // Let open menus, flyouts and text inputs consume their own Escape first
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest(ESCAPE_OWNED_BY_TARGET_SELECTOR)) return;
      dashboardApi.clearSelectedPanels();
    };

    const onRootMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const hasModifier = isSelectionModifier(e);
      const isSelectionMode = dashboardApi.selectedPanelIds$.value.length > 0;
      if (!hasModifier && !isSelectionMode) return;
      const target = e.target as HTMLElement;
      if (
        target.closest(
          isSelectionMode ? SELECTION_MODE_IGNORED_TARGET_SELECTOR : IGNORED_TARGET_SELECTOR
        )
      ) {
        return;
      }

      e.preventDefault(); // no text selection or native drag
      e.stopPropagation(); // charts, maps and the grid drag/resize handles never see this mousedown

      // The page may scroll while the rectangle is being drawn (auto-scroll near the viewport edges),
      // so the start corner is anchored to the document and converted back to viewport coordinates
      const scrollContainer = getScrollContainer();
      const startScrollTop = getScrollPosition(scrollContainer);
      const start = { x: e.clientX, y: e.clientY };
      const getStart = () => ({
        x: start.x,
        y: start.y + startScrollTop - getScrollPosition(scrollContainer),
      });
      let current = { ...start };
      const startPanelId = findPanelId(target);
      let isMarquee = false;

      const updateMarquee = () => {
        const rect = toRect(getStart(), current);
        setMarqueeRect(rect);
        setMarqueePreview(getPanelsIntersecting(rect)); // outline the panels that would be selected
      };

      const onMouseMove = (moveEvent: MouseEvent) => {
        current = { x: moveEvent.clientX, y: moveEvent.clientY };
        if (
          !isMarquee &&
          (Math.abs(current.x - start.x) > MARQUEE_THRESHOLD_PX ||
            Math.abs(current.y - start.y) > MARQUEE_THRESHOLD_PX)
        ) {
          isMarquee = true;
          startAutoScroll(scrollContainer); // same auto-scroll the grid uses while dragging a panel
          document.addEventListener('scroll', updateMarquee, { capture: true, passive: true });
        }
        if (isMarquee) {
          handleAutoscroll(moveEvent);
          updateMarquee();
        }
      };

      const onMouseUp = (upEvent: MouseEvent) => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('scroll', updateMarquee, { capture: true });
        stopAutoScroll();
        suppressNextClick = true;

        if (!isMarquee) {
          if (startPanelId) {
            dashboardApi.togglePanelSelection(startPanelId);
          } else if (!hasModifier) {
            // plain click on the grid background while in selection mode
            dashboardApi.clearSelectedPanels();
          }
          return;
        }

        const rect = toRect(getStart(), { x: upEvent.clientX, y: upEvent.clientY });
        dashboardApi.addPanelsToSelection(getPanelsIntersecting(rect));
        setMarqueePreview([]);
        setMarqueeRect(undefined);
      };

      document.addEventListener('mousemove', onMouseMove, { passive: true });
      document.addEventListener('mouseup', onMouseUp, { once: true });
    };

    root.addEventListener('mousedown', onRootMouseDown, { capture: true });
    document.addEventListener('mousedown', onDocumentMouseDown, { capture: true });
    document.addEventListener('click', onDocumentClick, { capture: true });
    document.addEventListener('click', onDocumentClickBubbled);
    document.addEventListener('keydown', onDocumentKeyDown);
    document.addEventListener('scroll', hideSelectHint, { capture: true, passive: true }); // the hint is fixed-positioned
    return () => {
      root.removeEventListener('mousedown', onRootMouseDown, { capture: true });
      document.removeEventListener('mousedown', onDocumentMouseDown, { capture: true });
      document.removeEventListener('click', onDocumentClick, { capture: true });
      document.removeEventListener('click', onDocumentClickBubbled);
      document.removeEventListener('keydown', onDocumentKeyDown);
      document.removeEventListener('scroll', hideSelectHint, { capture: true });
      hideSelectHint();
      stopAutoScroll();
      setMarqueePreview([]);
      setMarqueeRect(undefined);
    };
  }, [layoutRef, panelRefs, enabled, dashboardApi]);

  return { marqueeRect, selectHintRect };
};
