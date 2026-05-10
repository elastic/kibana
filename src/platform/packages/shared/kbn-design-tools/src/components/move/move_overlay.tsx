/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { css, Global } from '@emotion/react';
import { css as emotionCss } from '@emotion/css';
import { EuiPortal, useEuiTheme } from '@elastic/eui';
import { DEVTOOL_CLONE_ATTR, DEVELOPER_TOOLBAR_ID, MEASURE_OVERLAY_ID } from '../../lib/constants';
import { cloneElement } from '../../lib/dom/clone_element';
import { getElementUnder } from '../../lib/dom/get_element_under';
import type { ElementOffset } from '../../lib/dom/get_element_under';
import { snapToGrid } from '../../lib/dom/snap_to_grid';
import type { LayoutConfig } from '../../lib/layout/layout_config';

interface DragState {
  el: HTMLElement;
  clone: HTMLElement;
  startX: number;
  startY: number;
  baseOffsetX: number;
  baseOffsetY: number;
  /** The original element's rect before any dragging — used for snap calculations. */
  originalRect: DOMRect;
}

interface Props {
  layoutConfig: LayoutConfig;
  isLayoutVisible: boolean;
  setIsMoveMode: Dispatch<SetStateAction<boolean>>;
}

/**
 * Full-screen overlay that enables element dragging.
 * Click an element to grab it, drag to reposition via CSS transform, click again to release.
 * Press Escape to exit move mode and reset all moved elements.
 */
export const MoveOverlay = ({ layoutConfig, isLayoutVisible, setIsMoveMode }: Props) => {
  const { euiTheme } = useEuiTheme();
  const [hoverTarget, setHoverTarget] = useState<HTMLElement | null>(null);
  const [toolbarHeight, setToolbarHeight] = useState(0); // Measure toolbar height to match the layout overlay's available height for row snapping
  const [cursor, setCursor] = useState('');
  const dragging = useRef<DragState | null>(null);
  const movedElements = useRef<ElementOffset[]>([]);
  const rafId = useRef<number>(0);

  useEffect(() => {
    const toolbar = document.getElementById(DEVELOPER_TOOLBAR_ID);
    if (!toolbar) return;

    const update = () => setToolbarHeight(toolbar.getBoundingClientRect().height);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(toolbar);
    return () => observer.disconnect();
  }, []);

  const resetAll = useCallback(() => {
    for (const entry of movedElements.current) {
      entry.el.style.transform = entry.originalTransform;
      entry.el.style.visibility = '';
      entry.el.style.pointerEvents = '';
      entry.clone?.remove();
    }
    movedElements.current = [];
    if (dragging.current) {
      dragging.current.clone.remove();
      dragging.current = null;
    }
  }, []);

  const outlineCss = useMemo(() => {
    const accentColor = euiTheme.colors.primary;
    return emotionCss({
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: Number(euiTheme.levels.toast) + 3,
      border: `2px solid ${accentColor}`,
      borderRadius: '2px',
    });
  }, [euiTheme.colors.primary, euiTheme.levels.toast]);

  const findElement = useCallback(
    (x: number, y: number) => getElementUnder(x, y, movedElements.current),
    []
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        if (dragging.current) {
          const { clone, startX, startY, baseOffsetX, baseOffsetY, originalRect } =
            dragging.current;
          const mouseDx = event.clientX - startX;
          const mouseDy = event.clientY - startY;
          let dx = baseOffsetX + mouseDx;
          let dy = baseOffsetY + mouseDy;

          // Snap to grid unless Shift is held or layout is not visible
          if (!event.shiftKey && isLayoutVisible) {
            const snapped = snapToGrid(
              dx,
              dy,
              originalRect.left,
              originalRect.top,
              layoutConfig,
              window.innerWidth,
              window.innerHeight - toolbarHeight
            );
            dx = snapped.dx;
            dy = snapped.dy;
          }

          // Use transform instead of left/top — avoids layout recalc, enables GPU compositing
          clone.style.transform = `translate(${dx}px, ${dy}px)`;

          const existing = movedElements.current.find((e) => e.el === dragging.current!.el);
          if (existing) {
            existing.dx = dx;
            existing.dy = dy;
          }
        } else {
          const nextTarget = findElement(event.clientX, event.clientY);
          const nextCursor = nextTarget ? 'grab' : '';
          setHoverTarget((prev) => (prev === nextTarget ? prev : nextTarget));
          setCursor((prev) => (prev === nextCursor ? prev : nextCursor));
        }
      });
    },
    [findElement, layoutConfig, isLayoutVisible, toolbarHeight]
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      const target = findElement(event.clientX, event.clientY);

      // No valid target — let the event reach whatever is underneath (toolbar, etc.)
      if (!target) return;

      event.preventDefault();
      event.stopPropagation();

      // Check if we're re-grabbing an existing clone
      const existingByClone = target.hasAttribute(DEVTOOL_CLONE_ATTR)
        ? movedElements.current.find((e) => e.clone === target)
        : null;

      if (existingByClone) {
        // Reuse the existing clone — just start dragging it
        const clone = existingByClone.clone!;
        clone.style.pointerEvents = 'none';

        dragging.current = {
          el: existingByClone.el,
          clone,
          startX: event.clientX,
          startY: event.clientY,
          baseOffsetX: existingByClone.dx,
          baseOffsetY: existingByClone.dy,
          originalRect: existingByClone.originalRect,
        };
      } else {
        // First time grabbing this element
        const existing = movedElements.current.find((e) => e.el === target);

        if (!existing) {
          movedElements.current.push({
            el: target,
            clone: null,
            dx: 0,
            dy: 0,
            originalTransform: target.style.transform || '',
            originalRect: target.getBoundingClientRect(),
          });
        } else if (existing.clone) {
          existing.clone.remove();
          existing.clone = null;
        }

        // Create a visual clone on document.body — always on top, no stacking context issues
        const cloneZIndex = Number(euiTheme.levels.toast) + 1;
        const { clone, rect } = cloneElement(target, cloneZIndex);
        document.body.appendChild(clone);

        // Hide the original (preserve layout space) and block pointer events
        // so it doesn't trigger hover effects or the move overlay outline.
        target.style.visibility = 'hidden';
        target.style.pointerEvents = 'none';

        // Store the original element rect for consistent snap calculations across re-grabs
        const entry = movedElements.current.find((e) => e.el === target);
        if (entry) {
          entry.originalRect = rect;
        }

        dragging.current = {
          el: target,
          clone,
          startX: event.clientX,
          startY: event.clientY,
          baseOffsetX: entry?.dx ?? 0,
          baseOffsetY: entry?.dy ?? 0,
          originalRect: rect,
        };
      }

      setHoverTarget(null);
      setCursor('grabbing');
    },
    [findElement, euiTheme.levels.toast]
  );

  const handlePointerUp = useCallback((event: PointerEvent) => {
    if (!dragging.current) return;
    event.preventDefault();
    event.stopPropagation();

    const { el, clone } = dragging.current;
    const existing = movedElements.current.find((e) => e.el === el);

    // Keep clone visible and original hidden so the element stays on top.
    // Clones are only cleaned up when exiting move mode (resetAll).
    // Re-enable pointer events so elementsFromPoint can find the clone for re-grabbing.
    if (existing) {
      existing.clone = clone;
      clone.style.pointerEvents = 'auto';
    }

    dragging.current = null;
    setCursor((prev) => (prev === 'grab' ? prev : 'grab'));
  }, []);

  const handleKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // If measure mode is active, let its handler consume Escape first
        if (document.getElementById(MEASURE_OVERLAY_ID)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        resetAll();
        setIsMoveMode(false);
      }
    },
    [resetAll, setIsMoveMode]
  );

  const handleClick = useCallback(
    (event: MouseEvent) => {
      const target = findElement(event.clientX, event.clientY);
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
    },
    [findElement]
  );

  // Forcibly end drag on focus/visibility loss to prevent stuck state
  const abortDrag = useCallback(() => {
    if (!dragging.current) return;
    const { el, clone } = dragging.current;
    const existing = movedElements.current.find((e) => e.el === el);
    if (existing) {
      existing.clone = clone;
      clone.style.pointerEvents = 'auto';
    }
    dragging.current = null;
    setCursor((prev) => (prev === 'grab' ? prev : 'grab'));
  }, []);

  useEffect(() => {
    const handleBlur = () => abortDrag();
    const handleVisibilityChange = () => {
      if (document.hidden) abortDrag();
    };

    document.addEventListener('pointermove', handlePointerMove, true);
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('pointerup', handlePointerUp, true);
    document.addEventListener('pointercancel', handlePointerUp, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeydown, true);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      cancelAnimationFrame(rafId.current);
      resetAll();
      document.removeEventListener('pointermove', handlePointerMove, true);
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('pointerup', handlePointerUp, true);
      document.removeEventListener('pointercancel', handlePointerUp, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeydown, true);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    handlePointerMove,
    handlePointerDown,
    handlePointerUp,
    handleClick,
    handleKeydown,
    resetAll,
    abortDrag,
  ]);

  const hoverOutline = useMemo(() => {
    if (!hoverTarget || dragging.current) return null;
    const rect = hoverTarget.getBoundingClientRect();
    return (
      <div
        className={outlineCss}
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }}
        data-test-subj="moveOverlayOutline"
      />
    );
  }, [hoverTarget, outlineCss]);

  return (
    <>
      {cursor && (
        <Global
          styles={css({
            'body *': {
              cursor: `${cursor} !important`,
            },
          })}
        />
      )}
      {hoverOutline ? <EuiPortal>{hoverOutline}</EuiPortal> : null}
    </>
  );
};
