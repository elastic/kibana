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
import { useHoverLock } from '../../hooks/use_hover_lock';
import { useDeleteElement } from '../../hooks/use_delete_element';
import { useEditListeners } from '../../edit_engine/use_edit_listeners';
import { useOverlayZIndex } from '../../hooks/use_overlay_z_index';
import { useScrollSync } from '../../edit_engine/use_scroll_sync';
import { useLockedTarget } from '../../hooks/use_locked_target';
import { useEditChangeTracker } from '../../hooks/use_edit_change_tracker';
import { useInteractionMachine } from '../../edit_engine/use_interaction_machine';
import { DEVTOOL_HIDDEN_ATTR, DEVTOOL_MANAGED_ATTR, MEASURE_OVERLAY_ID } from '../../lib/constants';
import {
  isEscapeKey,
  isDeleteKey,
  isDuplicateShortcut,
  isEditShortcut,
  isUndoShortcut,
  isRedoShortcut,
} from '../../lib/keyboard_shortcuts';
import { getElementUnder } from '../../lib/dom/get_element_under';
import type { LayoutConfig } from '../../lib/layout/layout_config';
import { GlobalCursorOverride } from '../global_cursor_override';
import type { ElementSession } from '../../edit_engine/element_registry';
import { ElementRegistry, applyEditChanges } from '../../edit_engine/element_registry';
import type { StyleEdit, TextEdit, MediaEdit } from '../../edit_engine/element_registry';
import { createDuplicate } from '../../edit_engine/duplicate_helpers';
import {
  cloneClean,
  softHideElement,
  buildElementMap,
  buildTextNodeMap,
} from '../../edit_engine/clone_element';
import { useUndoRedo } from '../../hooks/use_undo_redo';
import { snapshotSession } from '../../lib/history/snapshot';
import { captureOriginalStyles } from '../../lib/history/snapshot';
import type { DuplicateTransaction, ImportTransaction } from '../../lib/history/transaction';
import { closePortaledPopovers } from '../../edit_engine/drag_helpers';
import { EditOutline } from './outline/edit_outline';
import { EditModal } from './modal/edit_modal';
import type { StyleChange, TextNodeChange, MediaChange } from './modal/edit_modal';
import {
  exportState,
  importState,
  downloadAsJsonFile,
} from '../../lib/history/serialization/session_io';
import type { ImportResult, ExportedState } from '../../lib/history/serialization/session_io';

export interface EditOverlayHandle {
  resetAll: () => void;
  insertElement: (
    element: HTMLElement,
    liveReactElement?: { element: ReactElement; zIndex: number },
    cleanup?: () => void
  ) => void;
  exportSessions: () => void;
  importSessions: (file: ExportedState) => Promise<ImportResult>;
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
 * `hoverTargetRef`.  This is intentional - pointer-move handlers fire
 * every frame and reading or writing React state each time would trigger
 * costly re-renders with no visible benefit.
 *
 * The refs form a **parallel mutable state system** that lives outside
 * React's render cycle.  The tradeoff is that React cannot observe changes
 * to these values, so any derived UI (cursor, outline, modal) must be
 * bridged explicitly via `setCursor`, `updateHoverTarget`, etc.
 *
 * When modifying this component, keep the following invariants:
 * - Only write to a ref inside a callback, effect, or event handler -
 *   never during render.
 * - When a ref change must be visible to React, call the corresponding
 *   state setter in the same handler (see `updateHoverTarget`).
 * - Treat `interaction.current` as a finite state machine - transitions
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

  /**
   * Tracks the pending duplicate transaction so the auto-drag that
   * follows can merge into it instead of pushing a separate move.
   */
  const pendingDuplicateRef = useRef<DuplicateTransaction | null>(null);

  const { editCount } = useEditChangeTracker(registry);
  const { push: pushTransaction, undo, redo, clear: clearHistory } = useUndoRedo(registry);

  // Keep ref in sync with state so stable callbacks can read the current value.
  const updateHoverTarget = useCallback((next: HTMLElement | null) => {
    hoverTargetRef.current = next;
    setHoverTarget(next);
  }, []);

  const { isInsideHoverLock, clearLock } = useHoverLock(hoverTarget);

  const { deleteElement: rawDeleteElement, trackDeletion, restoreAll } = useDeleteElement();

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

      closePortaledPopovers(el);

      if (session) {
        const snapshot = snapshotSession(session);
        pushTransaction({
          type: 'delete',
          label: 'Delete',
          element: el,
          sessionSnapshot: snapshot,
        });
        registry.current.delete(session);
        trackDeletion(el);
        el.remove();
      } else {
        const originalStyles = captureOriginalStyles(el);
        pushTransaction({ type: 'delete', label: 'Delete', element: el, originalStyles });
        rawDeleteElement(el);
      }

      updateHoverTarget(null);
      clearLock();
      setCursor('');
      notifyCount();
    },
    [rawDeleteElement, trackDeletion, clearLock, notifyCount, updateHoverTarget, pushTransaction]
  );

  const resetAll = useCallback(() => {
    const state = machine.getState();
    if (state.type === 'drag') {
      state.session.el.remove();
    }
    machine.forceIdle();
    stickyHover.current = null;
    pendingDuplicateRef.current = null;
    registry.current.resetAll();
    restoreAll();
    clearHistory();
    onChangeCount?.(0);
  }, [onChangeCount, restoreAll, machine, clearHistory]);

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
        mediaEdits: [],
        cleanup,
      };
      registry.current.set(session);
      pushTransaction({
        type: 'duplicate',
        label: 'Insert',
        element,
        sessionSnapshot: snapshotSession(session),
      });
      stickyHover.current = element;
      updateHoverTarget(element);
      setCursor('grab');
      notifyCount();
    },
    [notifyCount, updateHoverTarget, pushTransaction]
  );

  useImperativeHandle(
    handleRef,
    () => ({
      resetAll,
      insertElement,
      exportSessions: () => {
        const state = exportState(registry.current);
        downloadAsJsonFile(state, `design-tools-export-${Date.now()}.json`);
      },
      importSessions: async (file: ExportedState) => {
        const result = await importState(file, registry.current);
        if (result.restoredCount > 0 || result.deletedCount > 0) {
          const sessionSnapshots = result.importedElements.map((element) => {
            const session = registry.current.get(element)!;
            return { element, snapshot: snapshotSession(session) };
          });

          pushTransaction({
            type: 'import',
            label: 'Import',
            sessionSnapshots,
            deletions: result.importedDeletions,
          } satisfies Omit<ImportTransaction, 'id' | 'timestamp'>);

          notifyCount();
        }
        return result;
      },
    }),
    [resetAll, insertElement, notifyCount, pushTransaction]
  );

  // Reset all edits when SPA navigation removes the edited originals.
  // Hidden originals are marked with DEVTOOL_HIDDEN_ATTR. When React
  // unmounts them during navigation we detect the removal and reset.
  // Duplicates have no hidden original, so we also check whether any
  // session's referenceEl was disconnected from the document.
  useEffect(() => {
    let lastHref = window.location.href;

    const observer = new MutationObserver((mutations) => {
      // Nothing to invalidate when no sessions are active.
      if (registry.current.size === 0) return;

      // Detect SPA navigation by comparing the current URL to the last
      // seen value. MutationObserver fires naturally when React swaps
      // page content, no History monkeypatching needed.
      const currentHref = window.location.href;
      if (currentHref !== lastHref) {
        lastHref = currentHref;
        resetAll();
        return;
      }

      let hasRemovals = false;
      for (const mutation of mutations) {
        if (mutation.removedNodes.length === 0) continue;
        hasRemovals = true;
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

      // Only check referenceEl connectivity when nodes were actually removed.
      if (!hasRemovals) return;

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
      // When a keyboard-initiated auto-drag (e.g. Cmd+C duplicate) is
      // active, pointerDown parks the drag without producing a gesture
      // completion.  Merge the final position into the pending duplicate
      // transaction before parking so undo/redo captures the drop site.
      const pendingDup = pendingDuplicateRef.current;
      if (pendingDup) {
        const state = machine.getState();
        if (state.type === 'drag' && state.session.el === pendingDup.element) {
          pendingDup.sessionSnapshot = snapshotSession(state.session);
          pendingDuplicateRef.current = null;
        }
      }
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
        // Clean up the orphaned clone so it doesn't linger in the DOM.
        const orphanSession = registry.current.get(duplicate);
        if (orphanSession) {
          registry.current.delete(orphanSession);
        }
        duplicate.remove();
        notifyCount();
        return;
      }
      const session = registry.current.get(duplicate);
      if (session) {
        const tx = pushTransaction({
          type: 'duplicate',
          label: 'Duplicate',
          element: duplicate,
          sessionSnapshot: snapshotSession(session),
        }) as DuplicateTransaction;
        pendingDuplicateRef.current = tx;
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
    [zIndex.clone, clearLock, notifyCount, updateHoverTarget, machine, pushTransaction]
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      const completion = machine.handlePointerUp(event);
      if (!completion) return;

      if (completion.gesture === 'move') {
        if (completion.isNewClone && completion.referenceEl) {
          // Promotion + move is a single user action. The snapshot
          // captures the final position so no separate move is needed.
          pushTransaction({
            type: 'clone',
            label: 'Clone',
            element: completion.target,
            sessionSnapshot: snapshotSession(completion.session),
            referenceEl: completion.referenceEl,
          });
        } else {
          const pendingDup = pendingDuplicateRef.current;
          if (pendingDup && pendingDup.element === completion.target) {
            // Merge the auto-drag into the duplicate transaction so
            // undo/redo treats creation + placement as a single action.
            pendingDup.sessionSnapshot = snapshotSession(completion.session);
            pendingDuplicateRef.current = null;
          } else {
            pushTransaction({
              type: 'move',
              label: 'Move',
              target: completion.target,
              before: completion.before,
              after: completion.after,
            });
          }
        }
      } else if (completion.gesture === 'resize') {
        pushTransaction({
          type: 'resize',
          label: 'Resize',
          target: completion.target,
          before: completion.before,
          after: completion.after,
        });
      }
    },
    [machine, pushTransaction]
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
        return;
      }

      if (isUndoShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
        undo();
        stickyHover.current = null;
        updateHoverTarget(null);
        notifyCount();
        return;
      }

      if (isRedoShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
        redo();
        stickyHover.current = null;
        updateHoverTarget(null);
        notifyCount();
      }
    },
    [setIsEditMode, deleteElement, duplicateAndDrag, updateHoverTarget, undo, redo, notifyCount]
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
      pendingDuplicateRef.current = null;
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
      savedMediaChanges: MediaChange[]
    ) => {
      if (editModalTarget) {
        const isManaged = editModalTarget.hasAttribute(DEVTOOL_MANAGED_ATTR);

        let effectiveTarget = editModalTarget;
        let styleChanges = savedStyleChanges;
        let textChanges = savedTextChanges;
        let mediaChanges = savedMediaChanges;

        if (!isManaged) {
          // Guard: if the element was already promoted (e.g. by a concurrent
          // save), skip the clone+hide step and use the existing session.
          if (editModalTarget.hasAttribute(DEVTOOL_HIDDEN_ATTR)) {
            let found = false;
            for (const s of registry.current.values()) {
              if (s.referenceEl === editModalTarget) {
                effectiveTarget = s.el;
                found = true;
                break;
              }
            }
            if (!found) {
              setEditModalTarget(null);
              return;
            }
          } else {
            const { clone, rect } = cloneClean(editModalTarget, zIndex.clone);
            clone.style.transformOrigin = '0 0';
            document.body.appendChild(clone);

            softHideElement(editModalTarget);

            const elMap = buildElementMap(editModalTarget, clone);
            const textMap = buildTextNodeMap(editModalTarget, clone);

            styleChanges = savedStyleChanges.map((c) => ({
              ...c,
              element: (elMap.get(c.element) as HTMLElement) ?? c.element,
            }));
            textChanges = savedTextChanges.map((c) => ({
              ...c,
              node: textMap.get(c.node) ?? c.node,
            }));
            mediaChanges = savedMediaChanges.map((c) => ({
              ...c,
              element: elMap.get(c.element) ?? c.element,
            }));

            const session: ElementSession = {
              el: clone,
              dx: 0,
              dy: 0,
              dw: 0,
              dh: 0,
              originalRect: new DOMRect(rect.left, rect.top, rect.width, rect.height),
              isDuplicate: false,
              referenceEl: editModalTarget,
              styleEdits: [],
              textEdits: [],
              mediaEdits: [],
            };
            registry.current.set(session);
            effectiveTarget = clone;
          }
        }

        const session = registry.current.getOrCreate(effectiveTarget);

        const styleEdits: StyleEdit[] = [];
        const textEdits: TextEdit[] = [];
        const mediaEdits: MediaEdit[] = [];

        applyEditChanges(
          styleChanges,
          textChanges,
          mediaChanges,
          styleEdits,
          textEdits,
          mediaEdits
        );

        session.styleEdits.push(...styleEdits);
        session.textEdits.push(...textEdits);
        session.mediaEdits.push(...mediaEdits);

        pushTransaction({
          type: 'edit',
          label: 'Edit',
          target: effectiveTarget,
          promotedFrom: isManaged ? undefined : editModalTarget,
          styleChanges,
          textChanges,
          mediaChanges,
          undoRecords: { styleEdits, textEdits, mediaEdits },
        });
      }
      setEditModalTarget(null);
      notifyCount();
    },
    [editModalTarget, notifyCount, pushTransaction, zIndex.clone]
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
