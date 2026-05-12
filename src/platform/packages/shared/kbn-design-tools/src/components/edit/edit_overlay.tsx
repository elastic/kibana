/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Dispatch, Ref, SetStateAction } from 'react';
import { css, Global } from '@emotion/react';
import { EuiPortal, useEuiTheme } from '@elastic/eui';
import { useToolbarHeight } from '../../hooks';
import { DEVELOPER_TOOLBAR_ID, HANDLE_CURSORS, MEASURE_OVERLAY_ID } from '../../lib/constants';
import { getElementUnder } from '../../lib/dom/get_element_under';
import { snapToGrid } from '../../lib/dom/snap_to_grid';
import type { LayoutConfig } from '../../lib/layout/layout_config';
import { ElementRegistry } from './element_registry';
import { findExistingClone, startDragFromClone, startDragFromElement } from './drag_helpers';
import { buildTransform, calcResizeDeltas, findNearHandle, startResize } from './resize_helpers';
import type { InteractionState } from './interaction_state';
import { IDLE } from './interaction_state';
import { EditOutline } from './outline';

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

const NON_DELETABLE_TAGS = ['BODY', 'HTML'];

/**
 * Captures pointer events on the document to enable dragging and resizing elements
 * via CSS transforms. Press Escape to exit edit mode.
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
  const toolbarHeight = useToolbarHeight();
  const [cursor, setCursor] = useState('');
  const [hoverTarget, setHoverTarget] = useState<HTMLElement | null>(null);

  // Current interaction — only one gesture (drag, resize, hover) can be active at a time
  const interaction = useRef<InteractionState>(IDLE);
  const registry = useRef(new ElementRegistry());
  const rafId = useRef<number>(0);
  const deletedElements = useRef(new Set<HTMLElement>());
  const hoverLockBounds = useRef<{
    left: number;
    top: number;
    right: number;
    bottom: number;
    elementBottom: number;
  } | null>(null);

  const isInsideHoverLock = useCallback((x: number, y: number): boolean => {
    const bounds = hoverLockBounds.current;
    if (!bounds) return false;
    const padding = 12;
    // Only lock when cursor is in the controls zone below the element,
    // not inside the element itself (so children can still be targeted)
    return (
      x >= bounds.left - padding &&
      x <= bounds.right + padding &&
      y > bounds.elementBottom &&
      y <= bounds.bottom + padding
    );
  }, []);

  const resetAll = useCallback(() => {
    if (interaction.current.type === 'drag') {
      interaction.current.clone.remove();
    }
    interaction.current = IDLE;
    registry.current.resetAll();
    for (const el of deletedElements.current) {
      el.style.visibility = '';
      el.style.pointerEvents = '';
    }
    deletedElements.current.clear();
    onChangeCount?.(0);
  }, [onChangeCount]);

  useImperativeHandle(handleRef, () => ({ resetAll }), [resetAll]);

  const findElement = useCallback(
    (x: number, y: number) => getElementUnder(x, y, registry.current.toOffsetArray()),
    []
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const state = interaction.current;

        switch (state.type) {
          case 'resize': {
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
            } = state;
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

            const session = registry.current.get(state.el);
            if (session) {
              session.dx = dx;
              session.dy = dy;
              session.dw = width - session.originalRect.width;
              session.dh = height - session.originalRect.height;
            }
            onChangeCount?.(registry.current.size);
            break;
          }

          case 'drag': {
            const { clone, startX, startY, baseOffsetX, baseOffsetY, originalRect } = state;
            const mouseDx = event.clientX - startX;
            const mouseDy = event.clientY - startY;
            let dx = baseOffsetX + mouseDx;
            let dy = baseOffsetY + mouseDy;

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

            const session = registry.current.get(state.el);
            const origW = originalRect.width;
            const origH = originalRect.height;
            const scaleX = session ? (origW + session.dw) / origW : 1;
            const scaleY = session ? (origH + session.dh) / origH : 1;
            clone.style.transform = buildTransform(dx, dy, scaleX, scaleY);

            if (session) {
              session.dx = dx;
              session.dy = dy;
            }
            onChangeCount?.(registry.current.size);
            break;
          }

          default: {
            // No active gesture — update hover target and resize handle detection
            if (hoverTarget) {
              if (isInsideHoverLock(event.clientX, event.clientY)) {
                const nearHandle = findNearHandle(
                  event.clientX,
                  event.clientY,
                  hoverTarget.getBoundingClientRect()
                );
                if (nearHandle) {
                  interaction.current = { type: 'hover', target: hoverTarget, handle: nearHandle };
                  setCursor((prev) => {
                    const next = HANDLE_CURSORS[nearHandle];
                    return prev === next ? prev : next;
                  });
                } else {
                  interaction.current = IDLE;
                  setCursor((prev) => (prev === 'grab' ? prev : 'grab'));
                }
                return;
              }

              const nearHandle = findNearHandle(
                event.clientX,
                event.clientY,
                hoverTarget.getBoundingClientRect()
              );
              if (nearHandle) {
                interaction.current = { type: 'hover', target: hoverTarget, handle: nearHandle };
                setCursor((prev) => {
                  const next = HANDLE_CURSORS[nearHandle];
                  return prev === next ? prev : next;
                });
                return;
              }
            }

            interaction.current = IDLE;
            const nextTarget = findElement(event.clientX, event.clientY);
            const nextCursor = nextTarget ? 'grab' : '';
            setHoverTarget((prev) => (prev === nextTarget ? prev : nextTarget));
            setCursor((prev) => (prev === nextCursor ? prev : nextCursor));
          }
        }
      });
    },
    [
      findElement,
      layoutConfig,
      isLayoutVisible,
      toolbarHeight,
      onChangeCount,
      hoverTarget,
      isInsideHoverLock,
    ]
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      const state = interaction.current;

      // Start resize if hovering a handle
      if (state.type === 'hover' && state.handle) {
        const corner = state.handle;
        event.preventDefault();
        event.stopPropagation();

        let session = registry.current.find(state.target);
        if (!session || !session.clone) {
          const target = session?.el ?? state.target;
          const cloneZIndex = Number(euiTheme.levels.toast) + 1;
          const dragState = startDragFromElement(
            target,
            registry.current,
            cloneZIndex,
            event.clientX,
            event.clientY
          );
          session = registry.current.get(target)!;
          registry.current.setClone(session, dragState.clone);
          dragState.clone.style.pointerEvents = 'auto';
        }

        interaction.current = startResize(session, corner, event.clientX, event.clientY);
        setHoverTarget(null);
        setCursor(HANDLE_CURSORS[corner]);
        onChangeCount?.(registry.current.size);
        return;
      }

      const target = findElement(event.clientX, event.clientY);
      if (!target) return;

      event.preventDefault();
      event.stopPropagation();

      const existingSession = findExistingClone(target, registry.current);

      if (existingSession) {
        interaction.current = startDragFromClone(existingSession, event.clientX, event.clientY);
      } else {
        const cloneZIndex = Number(euiTheme.levels.toast) + 1;
        interaction.current = startDragFromElement(
          target,
          registry.current,
          cloneZIndex,
          event.clientX,
          event.clientY
        );
      }

      setHoverTarget(null);
      setCursor('grabbing');
      onChangeCount?.(registry.current.size);
    },
    [findElement, euiTheme.levels.toast, onChangeCount]
  );

  const parkInteraction = useCallback(() => {
    const state = interaction.current;
    if (state.type !== 'drag' && state.type !== 'resize') return;

    const session = registry.current.get(state.el);
    if (session) {
      registry.current.setClone(session, state.clone);
      state.clone.style.pointerEvents = 'auto';
    }
    interaction.current = IDLE;
    setCursor((prev) => (prev === 'grab' ? prev : 'grab'));
  }, []);

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      const state = interaction.current;
      if (state.type !== 'drag' && state.type !== 'resize') return;
      event.preventDefault();
      event.stopPropagation();
      parkInteraction();
    },
    [parkInteraction]
  );

  const isDeletable = useCallback((el: HTMLElement): boolean => {
    if (NON_DELETABLE_TAGS.includes(el.tagName)) return false;
    if (el.id === DEVELOPER_TOOLBAR_ID) return false;
    if (el.querySelector(`#${DEVELOPER_TOOLBAR_ID}`)) return false;
    return true;
  }, []);

  const deleteElement = useCallback(
    (el: HTMLElement) => {
      if (!isDeletable(el)) return;
      el.style.transition = 'opacity 120ms ease';
      el.style.opacity = '0';
      setTimeout(() => {
        el.style.visibility = 'hidden';
        el.style.pointerEvents = 'none';
        el.style.transition = '';
        el.style.opacity = '';
        deletedElements.current.add(el);
      }, 120);
      setHoverTarget(null);
      hoverLockBounds.current = null;
      setCursor('');
      onChangeCount?.(registry.current.size + deletedElements.current.size);
    },
    [isDeletable, onChangeCount]
  );

  const handleKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (document.getElementById(MEASURE_OVERLAY_ID)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        setIsEditMode(false);
        return;
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && hoverTarget) {
        event.preventDefault();
        event.stopPropagation();
        deleteElement(hoverTarget);
      }
    },
    [setIsEditMode, hoverTarget, deleteElement]
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

  const abortDrag = useCallback(() => {
    parkInteraction();
  }, [parkInteraction]);

  const handleScroll = useCallback(() => {
    for (const session of registry.current.values()) {
      if (!session.clone) continue;
      const rect = session.el.getBoundingClientRect();
      session.clone.style.left = `${rect.left}px`;
      session.clone.style.top = `${rect.top}px`;
    }
  }, []);

  // Reset hover/drag state when deactivated (e.g. Escape exits edit mode)
  useEffect(() => {
    if (hoverTarget) {
      const rect = hoverTarget.getBoundingClientRect();
      hoverLockBounds.current = {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom + 40,
        elementBottom: rect.bottom,
      };
    } else {
      hoverLockBounds.current = null;
    }
  }, [hoverTarget]);

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

  // Keep scroll listener active independently of edit mode so clones that
  // remain on-screen after exiting edit mode still track their originals.
  useEffect(() => {
    document.addEventListener('scroll', handleScroll, true);
    return () => document.removeEventListener('scroll', handleScroll, true);
  }, [handleScroll]);

  const showOutline =
    hoverTarget && interaction.current.type !== 'drag' && interaction.current.type !== 'resize';

  const handleDelete = useCallback(() => {
    if (!hoverTarget) return;
    deleteElement(hoverTarget);
  }, [hoverTarget, deleteElement]);

  return (
    <>
      {cursor && (
        <Global
          styles={css({
            'body *': {
              cursor: `${cursor} !important`,
            },
            '[data-devtool-ignore] button, [data-devtool-ignore] [role="button"]': {
              cursor: 'pointer !important',
            },
          })}
        />
      )}
      {showOutline ? (
        <EuiPortal>
          <EditOutline target={hoverTarget} onDelete={handleDelete} />
        </EuiPortal>
      ) : null}
    </>
  );
};
