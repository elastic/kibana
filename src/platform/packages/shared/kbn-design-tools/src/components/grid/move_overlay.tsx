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
import { MEASURE_OVERLAY_ID } from '../../lib/constants';
import { isIgnoredElement } from '../../lib/dom/is_ignored_element';

interface ElementOffset {
  el: HTMLElement;
  clone: HTMLElement | null;
  dx: number;
  dy: number;
  originalTransform: string;
}

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
      entry.clone?.remove();
    }
    movedElements.current = [];
    if (dragging.current) {
      dragging.current.clone.remove();
      dragging.current = null;
    }
  }, []);

  const cursorStyleEl = useRef<HTMLStyleElement | null>(null);

  const setCursor = useCallback((cursor: string) => {
    if (!cursorStyleEl.current) {
      cursorStyleEl.current = document.createElement('style');
      document.head.appendChild(cursorStyleEl.current);
    }
    cursorStyleEl.current.textContent = cursor ? `* { cursor: ${cursor} !important; }` : '';
  }, []);

  const removeCursorStyle = useCallback(() => {
    if (cursorStyleEl.current) {
      cursorStyleEl.current.remove();
      cursorStyleEl.current = null;
    }
  }, []);

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

  const getElementUnder = useCallback((x: number, y: number): HTMLElement | null => {
    const elements = document.elementsFromPoint(x, y);
    for (const el of elements) {
      // Clones (or their children) are valid targets — return the clone so it can be re-grabbed
      if (el instanceof HTMLElement && el.hasAttribute('data-devtool-clone')) return el;
      const cloneAncestor = (el as HTMLElement).closest?.(
        '[data-devtool-clone]'
      ) as HTMLElement | null;
      if (cloneAncestor) return cloneAncestor;
      // If the topmost non-clone element is ignored (toolbar, popover, overlay),
      // return null so the event passes through to it naturally.
      if (isIgnoredElement(el)) return null;
      if (el instanceof HTMLElement) {
        // Skip hidden originals that have a living clone
        const entry = movedElements.current.find((e) => e.el === el && e.clone);
        if (entry) continue;
        return el;
      }
    }
    return null;
  }, []);

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
        const target = getElementUnder(event.clientX, event.clientY);
        setHoverTarget(target);
        setCursor(target ? 'grab' : '');
      }
    },
    [getElementUnder, setCursor]
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      const target = getElementUnder(event.clientX, event.clientY);

      // No valid target — let the event reach whatever is underneath (toolbar, etc.)
      if (!target) return;

      event.preventDefault();
      event.stopPropagation();

      // Check if we're re-grabbing an existing clone
      const existingByClone = target.hasAttribute('data-devtool-clone')
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
        const rect = target.getBoundingClientRect();
        const clone = target.cloneNode(true) as HTMLElement;
        clone.style.position = 'fixed';
        clone.style.left = `${rect.left}px`;
        clone.style.top = `${rect.top}px`;
        clone.style.width = `${rect.width}px`;
        clone.style.height = `${rect.height}px`;
        clone.style.margin = '0';
        clone.style.zIndex = String(Number(euiTheme.levels.toast) + 1);
        clone.style.pointerEvents = 'none';
        clone.style.transform = '';
        clone.setAttribute('data-devtool-clone', '');
        document.body.appendChild(clone);

        // Hide the original (preserve layout space)
        target.style.visibility = 'hidden';

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
    [getElementUnder, setCursor, euiTheme.levels.toast]
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
      const target = getElementUnder(event.clientX, event.clientY);
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
    },
    [getElementUnder]
  );

  useEffect(() => {
    document.addEventListener('pointermove', handlePointerMove, true);
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('pointerup', handlePointerUp, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeydown, true);
    return () => {
      removeCursorStyle();
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
    removeCursorStyle,
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

  return <EuiPortal>{hoverOutline}</EuiPortal>;
};
