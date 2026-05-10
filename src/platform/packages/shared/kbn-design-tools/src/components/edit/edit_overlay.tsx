/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Dispatch, Ref, SetStateAction } from 'react';
import { css, Global } from '@emotion/react';
import { css as emotionCss } from '@emotion/css';
import { EuiPortal, useEuiTheme } from '@elastic/eui';
import { useToolbarHeight } from '../../hooks';
import {
  DEVTOOL_RESIZE_HANDLE_ATTR,
  HANDLE_CURSORS,
  MEASURE_OVERLAY_ID,
  RESIZE_HANDLE_SIZE,
} from '../../lib/constants';
import type { ResizeHandle } from '../../lib/constants';
import { getElementUnder } from '../../lib/dom/get_element_under';
import type { ElementOffset } from '../../lib/dom/get_element_under';
import { snapToGrid } from '../../lib/dom/snap_to_grid';
import type { LayoutConfig } from '../../lib/layout/layout_config';
import { findExistingClone, startDragFromClone, startDragFromElement } from './drag_helpers';
import type { DragState } from './drag_helpers';
import {
  buildTransform,
  calcResizeDeltas,
  findNearHandle,
  getHandleMode,
  startResize,
} from './resize_helpers';
import type { ResizeState } from './resize_helpers';

export interface EditOverlayHandle {
  resetAll: () => void;
}

interface Props {
  layoutConfig: LayoutConfig;
  isLayoutVisible: boolean;
  isActive: boolean;
  setIsEditMode: Dispatch<SetStateAction<boolean>>;
  onChangeCount?: (count: number) => void;
  handleRef?: Ref<EditOverlayHandle>;
}

/**
 * Full-screen overlay that enables element dragging.
 * Click an element to grab it, drag to reposition via CSS transform, click again to release.
 * Press Escape to exit edit mode.
 */
export const EditOverlay = ({
  layoutConfig,
  isLayoutVisible,
  isActive,
  setIsEditMode,
  onChangeCount,
  handleRef,
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const [hoverTarget, setHoverTarget] = useState<HTMLElement | null>(null);
  const toolbarHeight = useToolbarHeight();
  const [cursor, setCursor] = useState('');
  const dragging = useRef<DragState | null>(null);
  const resizing = useRef<ResizeState | null>(null);
  const hoveredHandle = useRef<ResizeHandle | null>(null);
  const movedElements = useRef<ElementOffset[]>([]);
  const rafId = useRef<number>(0);

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
    onChangeCount?.(0);
  }, [onChangeCount]);

  useImperativeHandle(handleRef, () => ({ resetAll }), [resetAll]);

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

  const handleCss = useMemo(() => {
    const accentColor = euiTheme.colors.primary;
    return emotionCss({
      position: 'absolute',
      width: RESIZE_HANDLE_SIZE,
      height: RESIZE_HANDLE_SIZE,
      background: accentColor,
      border: `1px solid ${accentColor}`,
      borderRadius: '1px',
      pointerEvents: 'auto',
    });
  }, [euiTheme.colors.primary]);

  const findElement = useCallback(
    (x: number, y: number) => getElementUnder(x, y, movedElements.current),
    []
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        if (resizing.current) {
          const {
            clone,
            handle,
            startX,
            startY,
            baseWidth,
            baseHeight,
            baseDx,
            baseDy,
            originalRect,
          } = resizing.current;
          const mouseDx = event.clientX - startX;
          const mouseDy = event.clientY - startY;
          const { dx, dy, width, height } = calcResizeDeltas(
            handle,
            mouseDx,
            mouseDy,
            baseWidth,
            baseHeight,
            baseDx,
            baseDy
          );

          const scaleX = width / originalRect.width;
          const scaleY = height / originalRect.height;
          clone.style.transform = buildTransform(dx, dy, scaleX, scaleY);

          const existing = movedElements.current.find((e) => e.el === resizing.current!.el);
          if (existing) {
            existing.dx = dx;
            existing.dy = dy;
            existing.dw = width - existing.originalRect.width;
            existing.dh = height - existing.originalRect.height;
          }
          onChangeCount?.(movedElements.current.length);
        } else if (dragging.current) {
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
          // Preserve scale from any prior resize operation
          const existing = movedElements.current.find((e) => e.el === dragging.current!.el);
          const origW = dragging.current.originalRect.width;
          const origH = dragging.current.originalRect.height;
          const scaleX = existing ? (origW + existing.dw) / origW : 1;
          const scaleY = existing ? (origH + existing.dh) / origH : 1;
          clone.style.transform = buildTransform(dx, dy, scaleX, scaleY);

          if (existing) {
            existing.dx = dx;
            existing.dy = dy;
          }
          onChangeCount?.(movedElements.current.length);
        } else {
          // Geometric hit test against handle positions — used for both cursor
          // feedback and as the authoritative resize signal consumed by pointerdown.
          if (hoverTarget) {
            const nearHandle = findNearHandle(
              event.clientX,
              event.clientY,
              hoverTarget.getBoundingClientRect()
            );
            if (nearHandle) {
              hoveredHandle.current = nearHandle;
              setCursor((prev) => {
                const next = HANDLE_CURSORS[nearHandle];
                return prev === next ? prev : next;
              });
              return;
            }
          }

          hoveredHandle.current = null;

          const nextTarget = findElement(event.clientX, event.clientY);
          const nextCursor = nextTarget ? 'grab' : '';
          setHoverTarget((prev) => (prev === nextTarget ? prev : nextTarget));
          setCursor((prev) => (prev === nextCursor ? prev : nextCursor));
        }
      });
    },
    [findElement, layoutConfig, isLayoutVisible, toolbarHeight, onChangeCount, hoverTarget]
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      // Use the cached geometric handle from pointermove — this is the same
      // signal that drove the cursor, so resize vs drag is always consistent.
      if (hoveredHandle.current && hoverTarget) {
        const corner = hoveredHandle.current;
        event.preventDefault();
        event.stopPropagation();

        // Ensure the element has a clone — create one if this is the first interaction.
        // hoverTarget may be the original element OR an existing clone, so check both.
        let entry = movedElements.current.find(
          (e) => e.el === hoverTarget || e.clone === hoverTarget
        );
        if (!entry || !entry.clone) {
          const target = entry?.el ?? hoverTarget;
          const cloneZIndex = Number(euiTheme.levels.toast) + 1;
          const dragState = startDragFromElement(
            target,
            movedElements.current,
            cloneZIndex,
            event.clientX,
            event.clientY
          );
          entry = movedElements.current.find((e) => e.el === target)!;
          // Assign the clone to the entry (normally done in handlePointerUp)
          entry.clone = dragState.clone;
          dragState.clone.style.pointerEvents = 'auto';
        }

        resizing.current = startResize(entry!, corner, event.clientX, event.clientY);
        setHoverTarget(null);
        setCursor(HANDLE_CURSORS[corner]);
        onChangeCount?.(movedElements.current.length);
        return;
      }

      const target = findElement(event.clientX, event.clientY);

      // No valid target — let the event reach whatever is underneath (toolbar, etc.)
      if (!target) return;

      event.preventDefault();
      event.stopPropagation();

      const existingByClone = findExistingClone(target, movedElements.current);

      if (existingByClone) {
        dragging.current = startDragFromClone(existingByClone, event.clientX, event.clientY);
      } else {
        const cloneZIndex = Number(euiTheme.levels.toast) + 1;
        dragging.current = startDragFromElement(
          target,
          movedElements.current,
          cloneZIndex,
          event.clientX,
          event.clientY
        );
      }

      setHoverTarget(null);
      setCursor('grabbing');
      onChangeCount?.(movedElements.current.length);
    },
    [findElement, euiTheme.levels.toast, onChangeCount, hoverTarget]
  );

  const handlePointerUp = useCallback((event: PointerEvent) => {
    if (resizing.current) {
      event.preventDefault();
      event.stopPropagation();
      const { el, clone } = resizing.current;
      const existing = movedElements.current.find((e) => e.el === el);
      if (existing) {
        existing.clone = clone;
        clone.style.pointerEvents = 'auto';
      }
      resizing.current = null;
      setCursor((prev) => (prev === 'grab' ? prev : 'grab'));
      return;
    }
    if (!dragging.current) return;
    event.preventDefault();
    event.stopPropagation();

    const { el, clone } = dragging.current;
    const existing = movedElements.current.find((e) => e.el === el);

    // Keep clone visible and original hidden so the element stays on top.
    // Clones are only cleaned up when exiting edit mode (resetAll).
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
        // Exit edit mode without resetting — changes persist until explicitly reset
        setIsEditMode(false);
      }
    },
    [setIsEditMode]
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

  // Forcibly end drag/resize on focus/visibility loss to prevent stuck state
  const abortDrag = useCallback(() => {
    if (resizing.current) {
      const { el, clone } = resizing.current;
      const existing = movedElements.current.find((e) => e.el === el);
      if (existing) {
        existing.clone = clone;
        clone.style.pointerEvents = 'auto';
      }
      resizing.current = null;
      setCursor((prev) => (prev === 'grab' ? prev : 'grab'));
      return;
    }
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

  // Reset hover/drag state when deactivated (e.g. Escape exits edit mode)
  useEffect(() => {
    if (!isActive) {
      setCursor('');
      setHoverTarget(null);
      abortDrag();
    }
  }, [isActive, abortDrag]);

  useEffect(() => {
    if (!isActive) return;

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
    isActive,
    handlePointerMove,
    handlePointerDown,
    handlePointerUp,
    handleClick,
    handleKeydown,
    resetAll,
    abortDrag,
  ]);

  const hoverOutline = useMemo(() => {
    if (!hoverTarget || dragging.current || resizing.current) return null;
    const rect = hoverTarget.getBoundingClientRect();
    const half = RESIZE_HANDLE_SIZE / 2;
    const mode = getHandleMode(rect);
    const allHandles: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    const visibleHandles =
      mode === 'none'
        ? []
        : mode === 'corners'
        ? allHandles.filter((h) => h.length === 2)
        : allHandles;
    const handlePositions: Record<ResizeHandle, { top: number; left: number }> = {
      nw: { top: -half, left: -half },
      n: { top: -half, left: rect.width / 2 - half },
      ne: { top: -half, left: rect.width - half },
      e: { top: rect.height / 2 - half, left: rect.width - half },
      se: { top: rect.height - half, left: rect.width - half },
      s: { top: rect.height - half, left: rect.width / 2 - half },
      sw: { top: rect.height - half, left: -half },
      w: { top: rect.height / 2 - half, left: -half },
    };

    return (
      <div
        className={outlineCss}
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }}
        data-test-subj="editOverlayOutline"
      >
        {visibleHandles.map((h) => (
          <div
            key={h}
            className={handleCss}
            style={{
              top: handlePositions[h].top,
              left: handlePositions[h].left,
              cursor: HANDLE_CURSORS[h],
            }}
            {...{ [DEVTOOL_RESIZE_HANDLE_ATTR]: h }}
            data-test-subj={`editOverlayResizeHandle-${h}`}
          />
        ))}
      </div>
    );
  }, [hoverTarget, outlineCss, handleCss]);

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
