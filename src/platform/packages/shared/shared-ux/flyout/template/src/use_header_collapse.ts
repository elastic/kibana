/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';

/** Minimum scrollTop (px) to trigger collapse. */
const COLLAPSE_AT = 16;

/** Maximum scrollTop (px) to trigger expand. Hysteresis band prevents flicker at the boundary. */
const EXPAND_AT = 4;

/** `WheelEvent.deltaMode` values; `deltaY` means something different under each. */
const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;

/**
 * Pixels per line for line-mode deltas. A wheel event carries a line count and no font metrics, so
 * the pixel height has to come from somewhere else. Reading the scroller's computed line height
 * would force a style recalc on every wheel event, and resolves to `normal` often enough that a
 * constant is needed as a fallback regardless. This matches the factor `@xyflow/system` uses.
 */
const WHEEL_LINE_HEIGHT = 20;

/**
 * Fraction of the viewport a page-mode delta scrolls. Browsers stop short of a full viewport so a
 * line of the previous screen stays visible to read against.
 */
const WHEEL_PAGE_FRACTION = 0.9;

/**
 * Normalizes a wheel delta to pixels, which is the only unit `scrollBy` accepts.
 *
 * `deltaY` is a bare number whose unit is given by `deltaMode`, so only pixel mode can be used
 * as-is. Firefox reports lines for a mouse wheel (a tick is `deltaY: 3`) and page mode reports
 * viewports, both of which would move the body by a few pixels per tick if passed through raw.
 */
const wheelDeltaToPixels = (event: WheelEvent, viewportHeight: number): number => {
  switch (event.deltaMode) {
    case DOM_DELTA_LINE:
      return event.deltaY * WHEEL_LINE_HEIGHT;
    case DOM_DELTA_PAGE:
      return event.deltaY * viewportHeight * WHEEL_PAGE_FRACTION;
    default:
      return event.deltaY;
  }
};

export interface HeaderCollapseState {
  isCollapsed: boolean;
  /**
   * Attach to the EuiFlyoutBody scroll container via its `scrollContainerRef` prop.
   * Registers the scroll listener and a ResizeObserver that re-evaluate collapse on layout changes.
   */
  scrollContainerRef: (node: HTMLElement | null) => void;
  /**
   * Attach to the inner div of the collapsible header region.
   * Tracks its expanded height so the overflow guard can determine whether collapsing is safe.
   */
  collapsibleRef: (node: HTMLElement | null) => void;
  /**
   * Attach to the expanded title row. Its height is part of the conservative collapse budget,
   * because the compact title can be shorter (especially when the expanded title wraps).
   */
  expandedTitleRef: (node: HTMLElement | null) => void;
  /**
   * Attach to the spacer after the collapsible region while the header is expanded.
   * Its full height is included in the collapse budget because that spacer also shrinks.
   */
  expandedSpacerRef: (node: HTMLElement | null) => void;
  /**
   * Attach to a wrapper element inside the flyout header. Registers a non-passive `wheel`
   * listener on the header itself, forwarding the scroll to the body.
   */
  headerRef: (node: HTMLElement | null) => void;
}

/**
 * Drives the collapse/expand state of the flyout header.
 *
 * Collapse is gated by an overflow guard: the body must overflow by more than a conservative
 * upper bound on the space the expanded header can return to the body. This keeps collapsing from
 * clamping scrollTop to the expansion threshold and immediately re-expanding.
 *
 * Pass `enabled: false` when the header is permanently collapsed — the scroll listener and
 * ResizeObserver are skipped, but `scrollerRef` is still populated so wheel forwarding works.
 */
export const useHeaderCollapse = ({
  enabled = true,
}: { enabled?: boolean } = {}): HeaderCollapseState => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const scrollerRef = useRef<HTMLElement | null>(null);
  const collapsibleHeightRef = useRef(0);
  const expandedTitleHeightRef = useRef(0);
  const expandedSpacerHeightRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const isScheduledRef = useRef(false);
  const scrollerCleanupRef = useRef<(() => void) | null>(null);
  const collapsibleCleanupRef = useRef<(() => void) | null>(null);
  const expandedTitleCleanupRef = useRef<(() => void) | null>(null);
  const expandedSpacerCleanupRef = useRef<(() => void) | null>(null);
  const headerCleanupRef = useRef<(() => void) | null>(null);

  const evaluate = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const { scrollTop, scrollHeight, clientHeight } = scroller;
    const collapsibleHeight = collapsibleHeightRef.current;
    const collapseBudget =
      collapsibleHeight + expandedTitleHeightRef.current + expandedSpacerHeightRef.current;
    setIsCollapsed((prev) => {
      // Nothing measured yet, so there is no budget to judge the collapse against. A header with
      // an empty collapsible region still has one, because the title row and spacer shrink too.
      if (collapseBudget <= 0) return false;
      // The overflow guard gates entry only. Collapsing shrinks the header, which grows the body
      // and shrinks its scroll range, so re-testing the guard while collapsed judges the state
      // against geometry the collapse itself produced: it reports "cannot collapse", expands,
      // which restores the scroll range and re-collapses, and the header oscillates. Leaving
      // collapse is therefore driven by scroll position alone.
      if (prev) return scrollTop > EXPAND_AT;
      return scrollHeight - clientHeight > collapseBudget + EXPAND_AT && scrollTop >= COLLAPSE_AT;
    });
  }, []);

  // A separate flag rather than testing `rafRef`, whose assignment lands after a synchronous callback.
  const scheduleEvaluate = useCallback(() => {
    if (isScheduledRef.current) return;
    isScheduledRef.current = true;
    rafRef.current = requestAnimationFrame(() => {
      isScheduledRef.current = false;
      rafRef.current = null;
      evaluate();
    });
  }, [evaluate]);

  const scrollContainerRef = useCallback(
    (node: HTMLElement | null) => {
      scrollerCleanupRef.current?.();
      scrollerCleanupRef.current = null;
      scrollerRef.current = node;
      if (!node || !enabled) return;
      node.addEventListener('scroll', scheduleEvaluate, { passive: true });
      const ro = new ResizeObserver(scheduleEvaluate);
      ro.observe(node);
      scrollerCleanupRef.current = () => {
        node.removeEventListener('scroll', scheduleEvaluate);
        ro.disconnect();
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
          isScheduledRef.current = false;
        }
      };
    },
    [enabled, scheduleEvaluate]
  );

  const observeNaturalHeight = useCallback(
    (
      node: HTMLElement | null,
      heightRef: MutableRefObject<number>,
      cleanupRef: MutableRefObject<(() => void) | null>
    ) => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      // Expanded-only refs detach during collapse, so preserve their last expanded measurements.
      if (!node) return;
      const updateHeight = () => {
        // `scrollHeight` rather than the observed box: the collapsible box animates down to zero,
        // but its content is only clipped, so its natural height remains available in both states.
        const naturalHeight = node.scrollHeight;
        if (naturalHeight === heightRef.current) return;
        heightRef.current = naturalHeight;
        scheduleEvaluate();
      };
      updateHeight();
      const ro = new ResizeObserver(updateHeight);
      ro.observe(node);
      cleanupRef.current = () => ro.disconnect();
    },
    [scheduleEvaluate]
  );

  const collapsibleRef = useCallback(
    (node: HTMLElement | null) => {
      observeNaturalHeight(node, collapsibleHeightRef, collapsibleCleanupRef);
    },
    [observeNaturalHeight]
  );

  const expandedTitleRef = useCallback(
    (node: HTMLElement | null) => {
      observeNaturalHeight(node, expandedTitleHeightRef, expandedTitleCleanupRef);
    },
    [observeNaturalHeight]
  );

  const expandedSpacerRef = useCallback(
    (node: HTMLElement | null) => {
      observeNaturalHeight(node, expandedSpacerHeightRef, expandedSpacerCleanupRef);
    },
    [observeNaturalHeight]
  );

  const headerRef = useCallback((node: HTMLElement | null) => {
    headerCleanupRef.current?.();
    headerCleanupRef.current = null;
    // Walk up to the flyout header element to cover its padding, which the inner wrapper does not.
    const header = node?.closest<HTMLElement>('.euiFlyoutHeader');
    if (!header) return;

    const onWheel = (event: Event) => {
      const scroller = scrollerRef.current;
      if (!scroller || !(event instanceof WheelEvent)) return;
      // Let modified wheel events (Ctrl/Cmd+scroll = browser zoom, Alt+scroll = h-scroll, etc.)
      // pass through unmodified so the browser can handle them normally.
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      // The header is not scrollable, so the browser would otherwise scroll the page behind it.
      // Requires the non-passive listener below; React's onWheel is passive and cannot do this.
      event.preventDefault();
      scroller.scrollBy({ top: wheelDeltaToPixels(event, scroller.clientHeight) });
    };

    header.addEventListener('wheel', onWheel, { passive: false });
    headerCleanupRef.current = () => header.removeEventListener('wheel', onWheel);
  }, []);

  // While disabled the scroll listener never runs, so `isCollapsed` would report a stale value.
  return {
    isCollapsed: enabled && isCollapsed,
    scrollContainerRef,
    collapsibleRef,
    expandedTitleRef,
    expandedSpacerRef,
    headerRef,
  };
};
