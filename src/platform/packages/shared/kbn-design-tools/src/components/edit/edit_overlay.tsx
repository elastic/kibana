/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Dispatch, ReactElement, Ref, SetStateAction } from 'react';
import { EuiPortal } from '@elastic/eui';
import {
  useToolbarHeight,
  useHoverLock,
  useDeleteElement,
  useEditListeners,
  useOverlayZIndex,
  useScrollSync,
  useLockedTarget,
  useEditChangeTracker,
} from '../../hooks';
import { DEVTOOL_HIDDEN_ATTR, HANDLE_CURSORS, MEASURE_OVERLAY_ID } from '../../lib/constants';
import {
  isEscapeKey,
  isDeleteKey,
  isDuplicateShortcut,
  isEditShortcut,
} from '../../lib/keyboard_shortcuts';
import { getElementUnder } from '../../lib/dom/get_element_under';
import type { LayoutConfig } from '../../lib/layout/layout_config';
import { GlobalCursorOverride } from '../global_cursor_override';
import type { ElementSession } from '../../lib/dom/element_registry';
import { ElementRegistry } from '../../lib/dom/element_registry';
import {
  findManagedSession,
  startDragFromSession,
  startDragFromElement,
  applyDragMove,
} from '../../lib/dom/drag_helpers';
import { createDuplicate } from '../../lib/dom/duplicate_helpers';
import { startResize, applyResizeMove } from '../../lib/dom/resize_helpers';
import type { InteractionState, DragState } from '../../lib/dom/interaction_state';
import { IDLE, deriveCursor } from '../../lib/dom/interaction_state';
import { resolveHoverTarget } from '../../lib/dom/resolve_hover_target';
import { EditOutline } from './outline';
import { EditModal } from './modal/edit_modal';
import type { StyleChange, TextNodeChange, SourceChange } from './modal/edit_modal';

export interface EditOverlayHandle {
  resetAll: () => void;
  insertElement: (
    element: HTMLElement,
    liveReactElement?: { element: ReactElement; zIndex: number },
    cleanup?: () => void
  ) => void;
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
  const hoverTargetRef = useRef<HTMLElement | null>(null);
  const [editModalTarget, setEditModalTarget] = useState<HTMLElement | null>(null);

  const interaction = useRef<InteractionState>(IDLE);
  const registry = useRef(new ElementRegistry());
  const rafId = useRef<number>(0);
  const stickyHover = useRef<HTMLElement | null>(null);
  const roundedTargets = useRef(new WeakSet<HTMLElement>());

  const { editCount, applyEdits } = useEditChangeTracker(registry);

  // Keep ref in sync with state so stable callbacks can read the current value.
  const updateHoverTarget = useCallback((next: HTMLElement | null) => {
    hoverTargetRef.current = next;
    setHoverTarget(next);
  }, []);

  const { isInsideHoverLock, clearLock } = useHoverLock(hoverTarget);

  const { deleteElement: rawDeleteElement, restoreAll } = useDeleteElement();

  const notifyCount = useCallback(() => {
    const hiddenOriginals = document.querySelectorAll(`[${DEVTOOL_HIDDEN_ATTR}]`).length;
    const duplicates = [...registry.current.values()].filter((s) => s.isDuplicate).length;
    onChangeCount?.(hiddenOriginals + duplicates + editCount());
  }, [onChangeCount, editCount]);

  const deleteElement = useCallback(
    (el: HTMLElement) => {
      const session = registry.current.get(el);

      if (session) {
        registry.current.removeSession(session);
      } else {
        rawDeleteElement(el);
      }

      updateHoverTarget(null);
      clearLock();
      setCursor('');
      notifyCount();
    },
    [rawDeleteElement, clearLock, notifyCount, updateHoverTarget]
  );

  const resetAll = useCallback(() => {
    if (interaction.current.type === 'drag') {
      interaction.current.session.el.remove();
    }
    interaction.current = IDLE;
    registry.current.resetAll();
    restoreAll();
    onChangeCount?.(0);
  }, [onChangeCount, restoreAll]);

  const insertElement = useCallback(
    (
      element: HTMLElement,
      liveReactElement?: { element: ReactElement; zIndex: number },
      cleanup?: () => void
    ) => {
      const rect = element.getBoundingClientRect();
      const originalRect = new DOMRect(rect.left, rect.top, rect.width, rect.height);

      const session: ElementSession = {
        el: element,
        dx: 0,
        dy: 0,
        dw: 0,
        dh: 0,
        originalRect,
        isDuplicate: true,
        liveReactElement,
        styleEdits: [],
        textEdits: [],
        sourceEdits: [],
        cleanup,
      };
      registry.current.set(session);
      stickyHover.current = element;
      updateHoverTarget(element);
      setCursor('grab');
      notifyCount();
    },
    [notifyCount, updateHoverTarget]
  );

  useImperativeHandle(handleRef, () => ({ resetAll, insertElement }), [resetAll, insertElement]);

  // Reset all edits when SPA navigation removes the edited originals.
  // Hidden originals are marked with DEVTOOL_HIDDEN_ATTR — when React
  // unmounts them during navigation we detect the removal and reset.
  // Duplicates have no hidden original, so we also check whether any
  // session's referenceEl was disconnected from the document.
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const removed of mutation.removedNodes) {
          if (!(removed instanceof HTMLElement)) continue;
          if (
            removed.hasAttribute(DEVTOOL_HIDDEN_ATTR) ||
            removed.querySelector(`[${DEVTOOL_HIDDEN_ATTR}]`)
          ) {
            resetAll();
            return;
          }
        }
      }

      // Duplicates live on document.body and survive navigation, but their
      // referenceEl (the original page element) gets removed by React.
      for (const session of registry.current.values()) {
        if (session.referenceEl && !session.referenceEl.isConnected) {
          resetAll();
          return;
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [resetAll]);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const state = interaction.current;
        const currentHover = hoverTargetRef.current;

        switch (state.type) {
          case 'resize': {
            applyResizeMove(state, event.clientX, event.clientY);
            notifyCount();
            break;
          }

          case 'drag': {
            applyDragMove(state, event.clientX, event.clientY, event.shiftKey, {
              isLayoutVisible,
              layoutConfig,
              toolbarHeight,
            });
            notifyCount();
            break;
          }

          case 'pending-drag': {
            const dx = event.clientX - state.startX;
            const dy = event.clientY - state.startY;
            // Only promote to a real drag after moving more than 3px
            if (dx * dx + dy * dy < 9) return;

            const existingSession = findManagedSession(state.target, registry.current);
            if (existingSession) {
              interaction.current = startDragFromSession(
                existingSession,
                state.startX,
                state.startY
              );
            } else {
              interaction.current = startDragFromElement(
                state.target,
                registry.current,
                zIndex.clone,
                state.startX,
                state.startY
              );
            }
            setCursor('grabbing');
            notifyCount();
            // Apply the move that triggered promotion
            applyDragMove(
              interaction.current as DragState,
              event.clientX,
              event.clientY,
              event.shiftKey,
              { isLayoutVisible, layoutConfig, toolbarHeight }
            );
            break;
          }

          default: {
            interaction.current = IDLE;

            // Sticky hover: keep selection locked until cursor enters the element
            if (stickyHover.current) {
              const stickyRect = stickyHover.current.getBoundingClientRect();
              if (
                event.clientX >= stickyRect.left &&
                event.clientX <= stickyRect.right &&
                event.clientY >= stickyRect.top &&
                event.clientY <= stickyRect.bottom
              ) {
                stickyHover.current = null;
              } else {
                return;
              }
            }

            const resolution = resolveHoverTarget(
              event.clientX,
              event.clientY,
              currentHover,
              isInsideHoverLock,
              currentHover ? roundedTargets.current.has(currentHover) : false
            );

            if (resolution.handle) {
              interaction.current = {
                type: 'hover',
                target: resolution.target!,
                handle: resolution.handle,
              };
              setCursor(HANDLE_CURSORS[resolution.handle]);
              return;
            }

            if (resolution.isRounded && resolution.target) {
              roundedTargets.current.add(resolution.target);
            }

            // When locked in hover-lock zone with no handle, show grab cursor
            if (
              resolution.target === currentHover &&
              isInsideHoverLock(event.clientX, event.clientY)
            ) {
              setCursor('grab');
              return;
            }

            // When in rounded dead-zone with no handle, derive cursor from idle state
            if (resolution.target === currentHover && currentHover) {
              setCursor(deriveCursor(IDLE, currentHover));
              return;
            }

            updateHoverTarget(resolution.target);
            setCursor(resolution.target ? 'grab' : '');
          }
        }
      });
    },
    [
      layoutConfig,
      isLayoutVisible,
      toolbarHeight,
      notifyCount,
      isInsideHoverLock,
      updateHoverTarget,
      zIndex.clone,
    ]
  );

  const parkInteraction = useCallback(() => {
    const state = interaction.current;
    if (state.type !== 'drag' && state.type !== 'resize') return;

    state.session.el.style.pointerEvents = 'auto';
    // Clear will-change so the element leaves its GPU-composited layer.
    // Leaving will-change:'transform' after drag/resize disables subpixel
    // antialiasing and causes visibly blurry text.
    state.session.el.style.willChange = '';
    interaction.current = IDLE;
    setCursor('grab');
  }, []);

  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      const state = interaction.current;

      // If a keyboard-initiated drag is active (e.g. Cmd+D duplicate),
      // park it on the first pointer-down so the element becomes targetable.
      if (state.type === 'drag' || state.type === 'resize') {
        parkInteraction();
      }

      // Start resize if hovering a handle
      if (state.type === 'hover' && state.handle) {
        const corner = state.handle;
        event.preventDefault();
        event.stopPropagation();
        // Prevent native drag from stealing the pointer (fires pointercancel)
        (event.target as Element)?.setPointerCapture?.(event.pointerId);

        let session = registry.current.get(state.target);
        if (!session) {
          const dragState = startDragFromElement(
            state.target,
            registry.current,
            zIndex.clone,
            event.clientX,
            event.clientY
          );
          session = dragState.session;
          session.el.style.pointerEvents = 'auto';
        }

        interaction.current = startResize(session, corner, event.clientX, event.clientY);
        updateHoverTarget(null);
        setCursor(deriveCursor(interaction.current, null));
        notifyCount();
        return;
      }

      const target = getElementUnder(event.clientX, event.clientY);
      if (!target) return;

      event.preventDefault();
      event.stopPropagation();
      // Prevent native drag from stealing the pointer (fires pointercancel)
      (event.target as Element)?.setPointerCapture?.(event.pointerId);

      // Don't start a real drag yet — wait for the pointer to move beyond
      // a minimum threshold so that plain clicks don't create clones.
      interaction.current = {
        type: 'pending-drag',
        target,
        startX: event.clientX,
        startY: event.clientY,
      };

      updateHoverTarget(null);
      setCursor('grab');
      notifyCount();
    },
    [zIndex.clone, notifyCount, updateHoverTarget, parkInteraction]
  );

  const duplicateAndDrag = useCallback(
    async (target: HTMLElement) => {
      const duplicate = await createDuplicate(target, registry.current, zIndex.clone);
      const session = registry.current.get(duplicate);
      if (session) {
        const rect = duplicate.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        interaction.current = startDragFromSession(session, cx, cy);
      }
      updateHoverTarget(null);
      clearLock();
      setCursor('grabbing');
      notifyCount();
    },
    [zIndex.clone, clearLock, notifyCount, updateHoverTarget]
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      const state = interaction.current;

      if (state.type === 'pending-drag') {
        interaction.current = IDLE;
        (event.target as Element)?.releasePointerCapture?.(event.pointerId);
      } else if (state.type === 'drag' || state.type === 'resize') {
        event.preventDefault();
        event.stopPropagation();
        (event.target as Element)?.releasePointerCapture?.(event.pointerId);
        parkInteraction();
      } else {
        return;
      }

      // Re-resolve hover so the outline shows immediately
      const target = getElementUnder(event.clientX, event.clientY);
      updateHoverTarget(target);
      setCursor(target ? 'grab' : '');
    },
    [parkInteraction, updateHoverTarget]
  );

  const handleKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (isEscapeKey(event)) {
        if (document.getElementById(MEASURE_OVERLAY_ID)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        setIsEditMode(false);
        return;
      }

      const currentHover = hoverTargetRef.current;

      if (isDeleteKey(event) && currentHover) {
        event.preventDefault();
        event.stopPropagation();
        deleteElement(currentHover);
        return;
      }

      if (isDuplicateShortcut(event) && currentHover) {
        event.preventDefault();
        event.stopPropagation();
        duplicateAndDrag(currentHover);
        return;
      }

      if (isEditShortcut(event) && currentHover) {
        event.preventDefault();
        event.stopPropagation();
        setEditModalTarget(currentHover);
        setCursor('');
        updateHoverTarget(null);
      }
    },
    [setIsEditMode, deleteElement, duplicateAndDrag, updateHoverTarget]
  );

  const handleClick = useCallback((event: MouseEvent) => {
    if (!getElementUnder(event.clientX, event.clientY)) return;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const abortDrag = useCallback(() => {
    if (interaction.current.type === 'pending-drag') {
      interaction.current = IDLE;
    }
    parkInteraction();
  }, [parkInteraction]);

  useEffect(() => {
    if (!isActive) {
      setCursor('');
      updateHoverTarget(null);
      abortDrag();
    }
  }, [isActive, abortDrag, updateHoverTarget]);

  const listenersActive = isActive && !editModalTarget;

  useEditListeners(
    listenersActive,
    handlePointerMove,
    handlePointerDown,
    handlePointerUp,
    handleClick,
    handleKeydown,
    abortDrag,
    rafId
  );

  useScrollSync(registry);

  const showOutline =
    hoverTarget &&
    interaction.current.type !== 'drag' &&
    interaction.current.type !== 'resize' &&
    interaction.current.type !== 'pending-drag';

  const lockedTarget = useLockedTarget(hoverTarget, !!showOutline);

  const handleDelete = useCallback(() => {
    const currentHover = hoverTargetRef.current;
    if (!currentHover) return;
    deleteElement(currentHover);
  }, [deleteElement]);

  const handleEdit = useCallback(
    (target: HTMLElement) => {
      setEditModalTarget(target);
      setCursor('');
      updateHoverTarget(null);
    },
    [updateHoverTarget]
  );

  const handleEditClose = useCallback(() => {
    setEditModalTarget(null);
  }, []);

  const handleEditSave = useCallback(
    (
      savedStyleChanges: StyleChange[],
      savedTextChanges: TextNodeChange[],
      savedSourceChanges: SourceChange[]
    ) => {
      if (editModalTarget) {
        applyEdits(editModalTarget, savedStyleChanges, savedTextChanges, savedSourceChanges);
      }
      setEditModalTarget(null);
      notifyCount();
    },
    [editModalTarget, notifyCount, applyEdits]
  );

  const handleDuplicate = useCallback(() => {
    const currentHover = hoverTargetRef.current;
    if (!currentHover) return;
    duplicateAndDrag(currentHover);
  }, [duplicateAndDrag]);

  return (
    <>
      {cursor && <GlobalCursorOverride cursor={cursor} allowButtons />}
      {showOutline && lockedTarget ? (
        <EuiPortal>
          <EditOutline
            target={lockedTarget}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onEdit={handleEdit}
          />
        </EuiPortal>
      ) : null}
      {editModalTarget && (
        <EditModal target={editModalTarget} onClose={handleEditClose} onSave={handleEditSave} />
      )}
    </>
  );
};
