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
import { EuiPortal } from '@elastic/eui';
import {
  useToolbarHeight,
  useHoverLock,
  useDeleteElement,
  useEditListeners,
  useOverlayZIndex,
  useScrollSync,
} from '../../hooks';
import { HANDLE_CURSORS, MEASURE_OVERLAY_ID } from '../../lib/constants';
import { getElementUnder } from '../../lib/dom/get_element_under';
import type { LayoutConfig } from '../../lib/layout/layout_config';
import { GlobalCursorOverride } from '../global_cursor_override';
import { ElementRegistry } from './element_registry';
import {
  findExistingClone,
  startDragFromClone,
  startDragFromElement,
  applyDragMove,
} from './drag_helpers';
import { findNearHandle, startResize, applyResizeMove } from './resize_helpers';
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
  const toolbarHeight = useToolbarHeight();
  const zIndex = useOverlayZIndex();
  const [cursor, setCursor] = useState('');
  const [hoverTarget, setHoverTarget] = useState<HTMLElement | null>(null);

  const interaction = useRef<InteractionState>(IDLE);
  const registry = useRef(new ElementRegistry());
  const rafId = useRef<number>(0);

  const updateCursor = useCallback(
    (next: string) => setCursor((prev) => (prev === next ? prev : next)),
    []
  );

  const { isInsideHoverLock, clearLock } = useHoverLock(hoverTarget);

  const { deleteElement: rawDeleteElement, restoreAll, deletedCount } = useDeleteElement();

  const deleteElement = useCallback(
    (el: HTMLElement) => {
      // If the target is a clone, resolve to the original element,
      // remove the clone from DOM, and clean up the registry entry.
      const session = registry.current.getByClone(el);
      const target = session ? session.el : el;

      if (session) {
        session.clone?.remove();
        registry.current.delete(session);
        target.style.pointerEvents = '';
        target.style.transform = session.originalTransform;
      }

      rawDeleteElement(target);
      setHoverTarget(null);
      clearLock();
      setCursor('');
      onChangeCount?.(registry.current.size + deletedCount() + 1);
    },
    [rawDeleteElement, clearLock, onChangeCount, deletedCount]
  );

  const resetAll = useCallback(() => {
    if (interaction.current.type === 'drag') {
      interaction.current.clone.remove();
    }
    interaction.current = IDLE;
    registry.current.resetAll();
    restoreAll();
    onChangeCount?.(0);
  }, [onChangeCount, restoreAll]);

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
            applyResizeMove(state, event.clientX, event.clientY, registry.current);
            onChangeCount?.(registry.current.size);
            break;
          }

          case 'drag': {
            applyDragMove(state, event.clientX, event.clientY, event.shiftKey, registry.current, {
              isLayoutVisible,
              layoutConfig,
              toolbarHeight,
            });
            onChangeCount?.(registry.current.size);
            break;
          }

          default: {
            // No active gesture — update hover target and resize handle detection
            const detectHandle = (x: number, y: number, target: HTMLElement): boolean => {
              const nearHandle = findNearHandle(x, y, target.getBoundingClientRect());
              if (nearHandle) {
                interaction.current = { type: 'hover', target, handle: nearHandle };
                updateCursor(HANDLE_CURSORS[nearHandle]);
                return true;
              }
              return false;
            };

            if (hoverTarget) {
              if (isInsideHoverLock(event.clientX, event.clientY)) {
                if (!detectHandle(event.clientX, event.clientY, hoverTarget)) {
                  interaction.current = IDLE;
                  updateCursor('grab');
                }
                return;
              }

              if (detectHandle(event.clientX, event.clientY, hoverTarget)) {
                return;
              }
            }

            interaction.current = IDLE;
            const nextTarget = findElement(event.clientX, event.clientY);
            const nextCursor = nextTarget ? 'grab' : '';
            setHoverTarget((prev) => (prev === nextTarget ? prev : nextTarget));
            updateCursor(nextCursor);
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
      updateCursor,
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
          const dragState = startDragFromElement(
            target,
            registry.current,
            zIndex.clone,
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
        interaction.current = startDragFromElement(
          target,
          registry.current,
          zIndex.clone,
          event.clientX,
          event.clientY
        );
      }

      setHoverTarget(null);
      setCursor('grabbing');
      onChangeCount?.(registry.current.size);
    },
    [findElement, zIndex.clone, onChangeCount]
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

  useEffect(() => {
    if (!isActive) {
      setCursor('');
      setHoverTarget(null);
      abortDrag();
    }
  }, [isActive, abortDrag]);

  useEditListeners(
    isActive,
    {
      onPointerMove: handlePointerMove,
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerUp,
      onClick: handleClick,
      onKeydown: handleKeydown,
      onAbort: abortDrag,
    },
    rafId
  );

  useScrollSync(registry);

  const showOutline =
    hoverTarget && interaction.current.type !== 'drag' && interaction.current.type !== 'resize';

  const handleDelete = useCallback(() => {
    if (!hoverTarget) return;
    deleteElement(hoverTarget);
  }, [hoverTarget, deleteElement]);

  return (
    <>
      {cursor && <GlobalCursorOverride cursor={cursor} allowButtons />}
      {showOutline ? (
        <EuiPortal>
          <EditOutline target={hoverTarget} onDelete={handleDelete} />
        </EuiPortal>
      ) : null}
    </>
  );
};
