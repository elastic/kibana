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
import type { Dispatch, ReactElement, Ref, SetStateAction } from 'react';
import { EuiPortal } from '@elastic/eui';
import {
  useHoverLock,
  useDeleteElement,
  useEditListeners,
  useOverlayZIndex,
  useScrollSync,
  useLockedTarget,
  useEditChangeTracker,
  useInteractionMachine,
} from '../../hooks';
import { DEVTOOL_HIDDEN_ATTR, MEASURE_OVERLAY_ID } from '../../lib/constants';
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
import { createDuplicate } from '../../lib/dom/duplicate_helpers';
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
 *
 * ## Mutable ref state (design note)
 *
 * Several pieces of state are stored in `useRef` rather than `useState`:
 * `interaction`, `registry`, `rafId`, `stickyHover`, `roundedTargets`, and
 * `hoverTargetRef`.  This is intentional — pointer-move handlers fire at
 * 60 Hz and reading or writing React state on every frame would trigger
 * costly re-renders with no visible benefit.
 *
 * The refs form a **parallel mutable state system** that lives outside
 * React's render cycle.  The tradeoff is that React cannot observe changes
 * to these values, so any derived UI (cursor, outline, modal) must be
 * bridged explicitly via `setCursor`, `updateHoverTarget`, etc.
 *
 * When modifying this component, keep the following invariants:
 * - Only write to a ref inside a callback, effect, or event handler —
 *   never during render.
 * - When a ref change must be visible to React, call the corresponding
 *   state setter in the same handler (see `updateHoverTarget`).
 * - Treat `interaction.current` as a finite state machine — transitions
 *   must be exhaustive and deterministic.
 */
export const EditOverlay = ({
  layoutConfig,
  isLayoutVisible,
  isActive,
  setIsEditMode,
  onChangeCount,
  handleRef,
}: Props) => {
  const zIndex = useOverlayZIndex();
  const [cursor, setCursor] = useState('');
  const [hoverTarget, setHoverTarget] = useState<HTMLElement | null>(null);
  const hoverTargetRef = useRef<HTMLElement | null>(null);
  const [editModalTarget, setEditModalTarget] = useState<HTMLElement | null>(null);

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

  const effects = useMemo(
    () => ({ setCursor, updateHoverTarget, notifyCount }),
    [updateHoverTarget, notifyCount]
  );

  const machine = useInteractionMachine({
    registry,
    hoverTargetRef,
    stickyHover,
    roundedTargets,
    rafId,
    effects,
    isInsideHoverLock,
    cloneZIndex: zIndex.clone,
  });

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
    const state = machine.getState();
    if (state.type === 'drag') {
      state.session.el.remove();
    }
    machine.forceIdle();
    stickyHover.current = null;
    registry.current.resetAll();
    restoreAll();
    onChangeCount?.(0);
  }, [onChangeCount, restoreAll, machine]);

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
    let lastHref = window.location.href;

    const observer = new MutationObserver((mutations) => {
      // Detect SPA navigation by comparing the current URL to the last
      // seen value. MutationObserver fires naturally when React swaps
      // page content — no History monkeypatching needed.
      const currentHref = window.location.href;
      if (currentHref !== lastHref) {
        lastHref = currentHref;
        resetAll();
        return;
      }

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
      machine.handlePointerMove(event, layoutConfig, isLayoutVisible);
    },
    [machine, layoutConfig, isLayoutVisible]
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      machine.handlePointerDown(event);
    },
    [machine]
  );

  const duplicateAndDrag = useCallback(
    async (target: HTMLElement) => {
      const duplicate = await createDuplicate(target, registry.current, zIndex.clone);
      // Guard: if the user started a new gesture during the async
      // createDuplicate, don't overwrite it with a drag.
      const currentState = machine.getState();
      if (currentState.type !== 'idle' && currentState.type !== 'hover') {
        notifyCount();
        return;
      }
      const session = registry.current.get(duplicate);
      if (session) {
        const rect = duplicate.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        machine.startSessionDrag(session, cx, cy);
      }
      updateHoverTarget(null);
      clearLock();
      setCursor('grabbing');
      notifyCount();
    },
    [zIndex.clone, clearLock, notifyCount, updateHoverTarget, machine]
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      machine.handlePointerUp(event);
    },
    [machine]
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

  useEffect(() => {
    if (!isActive) {
      setCursor('');
      updateHoverTarget(null);
      machine.abortDrag();
      stickyHover.current = null;
    }
  }, [isActive, machine, updateHoverTarget]);

  const listenersActive = isActive && !editModalTarget;

  useEditListeners(
    listenersActive,
    handlePointerMove,
    handlePointerDown,
    handlePointerUp,
    handleClick,
    handleKeydown,
    machine.abortDrag,
    rafId
  );

  useScrollSync(registry);

  const interactionState = machine.getState();
  const showOutline =
    hoverTarget &&
    interactionState.type !== 'drag' &&
    interactionState.type !== 'resize' &&
    interactionState.type !== 'pending-drag';

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
