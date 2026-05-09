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
import { css } from '@emotion/css';
import { EuiPortal, useEuiTheme } from '@elastic/eui';
import { DEVTOOL_CLONE_ATTR, MEASURE_OVERLAY_ID } from '../../lib/constants';
import { cloneElement } from '../../lib/dom/clone_element';
import { getElementUnder } from '../../lib/dom/get_element_under';
import type { ElementOffset } from '../../lib/dom/get_element_under';
import { useCursorOverride } from '../../hooks/use_cursor_override';

interface DragState {
  el: HTMLElement;
  clone: HTMLElement;
  startX: number;
  startY: number;
  baseOffsetX: number;
  baseOffsetY: number;
  originRect: DOMRect;
}

interface Props {
  setIsMoveMode: Dispatch<SetStateAction<boolean>>;
}

/**
 * Full-screen overlay that enables element dragging.
 * Click an element to grab it, drag to reposition via CSS transform, click again to release.
 * Press Escape to exit move mode and reset all moved elements.
 */
export const MoveOverlay = ({ setIsMoveMode }: Props) => {
  const { euiTheme } = useEuiTheme();
  const [hoverTarget, setHoverTarget] = useState<HTMLElement | null>(null);
  const dragging = useRef<DragState | null>(null);
  const movedElements = useRef<ElementOffset[]>([]);

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

  const { setCursor, removeCursor } = useCursorOverride();

  const outlineCss = useMemo(() => {
    const accentColor = euiTheme.colors.primary;
    return css({
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
      if (dragging.current) {
        const { clone, startX, startY, baseOffsetX, baseOffsetY, originRect } = dragging.current;
        const mouseDx = event.clientX - startX;
        const mouseDy = event.clientY - startY;
        const dx = baseOffsetX + mouseDx;
        const dy = baseOffsetY + mouseDy;
        clone.style.left = `${originRect.left + mouseDx}px`;
        clone.style.top = `${originRect.top + mouseDy}px`;

        const existing = movedElements.current.find((e) => e.el === dragging.current!.el);
        if (existing) {
          existing.dx = dx;
          existing.dy = dy;
        }
      } else {
        const target = findElement(event.clientX, event.clientY);
        setHoverTarget(target);
        setCursor(target ? 'grab' : '');
      }
    },
    [findElement, setCursor]
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
        const cloneRect = clone.getBoundingClientRect();

        dragging.current = {
          el: existingByClone.el,
          clone,
          startX: event.clientX,
          startY: event.clientY,
          baseOffsetX: existingByClone.dx,
          baseOffsetY: existingByClone.dy,
          originRect: cloneRect,
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

        dragging.current = {
          el: target,
          clone,
          startX: event.clientX,
          startY: event.clientY,
          baseOffsetX: existing?.dx ?? 0,
          baseOffsetY: existing?.dy ?? 0,
          originRect: rect,
        };
      }

      setHoverTarget(null);
      setCursor('grabbing');
    },
    [findElement, setCursor, euiTheme.levels.toast]
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
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
      setCursor('grab');
    },
    [setCursor]
  );

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

  useEffect(() => {
    document.addEventListener('pointermove', handlePointerMove, true);
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('pointerup', handlePointerUp, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeydown, true);
    return () => {
      resetAll();
      removeCursor();
      document.removeEventListener('pointermove', handlePointerMove, true);
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('pointerup', handlePointerUp, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeydown, true);
    };
  }, [
    handlePointerMove,
    handlePointerDown,
    handlePointerUp,
    handleClick,
    handleKeydown,
    resetAll,
    removeCursor,
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

  return hoverOutline ? <EuiPortal>{hoverOutline}</EuiPortal> : null;
};
