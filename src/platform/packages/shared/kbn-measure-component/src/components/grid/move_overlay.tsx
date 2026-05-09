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
  dx: number;
  dy: number;
  originalTransform: string;
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
  const dragging = useRef<{
    el: HTMLElement;
    startX: number;
    startY: number;
    baseOffsetX: number;
    baseOffsetY: number;
  } | null>(null);
  const movedElements = useRef<ElementOffset[]>([]);

  const resetAll = useCallback(() => {
    for (const entry of movedElements.current) {
      entry.el.style.transform = entry.originalTransform;
    }
    movedElements.current = [];
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
      zIndex: Number(euiTheme.levels.toast) + 4,
      border: `2px solid ${accentColor}`,
      borderRadius: '2px',
    });
  }, [euiTheme.colors.primary, euiTheme.levels.toast]);

  const getElementUnder = useCallback((x: number, y: number): HTMLElement | null => {
    const elements = document.elementsFromPoint(x, y);
    // If the topmost element is ignored (toolbar, popover, overlay),
    // return null so the event passes through to it naturally.
    if (elements.length > 0 && isIgnoredElement(elements[0])) return null;
    for (const el of elements) {
      if (el instanceof HTMLElement) return el;
    }
    return null;
  }, []);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (dragging.current) {
        const { el, startX, startY, baseOffsetX, baseOffsetY } = dragging.current;
        const dx = baseOffsetX + event.clientX - startX;
        const dy = baseOffsetY + event.clientY - startY;
        el.style.transform = `translate(${dx}px, ${dy}px)`;

        const existing = movedElements.current.find((e) => e.el === el);
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

      const existing = movedElements.current.find((e) => e.el === target);

      if (!existing) {
        movedElements.current.push({
          el: target,
          dx: 0,
          dy: 0,
          originalTransform: target.style.transform || '',
        });
      }

      dragging.current = {
        el: target,
        startX: event.clientX,
        startY: event.clientY,
        baseOffsetX: existing?.dx ?? 0,
        baseOffsetY: existing?.dy ?? 0,
      };

      setHoverTarget(null);
      setCursor('grabbing');
    },
    [getElementUnder, setCursor]
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      if (!dragging.current) return;
      event.preventDefault();
      event.stopPropagation();
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

  useEffect(() => {
    document.addEventListener('pointermove', handlePointerMove, true);
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('pointerup', handlePointerUp, true);
    document.addEventListener('keydown', handleKeydown, true);
    return () => {
      removeCursorStyle();
      document.removeEventListener('pointermove', handlePointerMove, true);
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('pointerup', handlePointerUp, true);
      document.removeEventListener('keydown', handleKeydown, true);
    };
  }, [handlePointerMove, handlePointerDown, handlePointerUp, handleKeydown, removeCursorStyle]);

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
