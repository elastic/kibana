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
  useLockedTarget,
} from '../../hooks';
import { DEVTOOL_HIDDEN_ATTR, HANDLE_CURSORS, MEASURE_OVERLAY_ID } from '../../lib/constants';
import { isEscapeKey, isDeleteKey } from '../../lib/keyboard_shortcuts';
import { getElementUnder } from '../../lib/dom/get_element_under';
import type { LayoutConfig } from '../../lib/layout/layout_config';
import { GlobalCursorOverride } from '../global_cursor_override';
import { ElementRegistry } from '../../lib/dom/element_registry';
import {
  findManagedSession,
  startDragFromSession,
  startDragFromElement,
  applyDragMove,
} from '../../lib/dom/drag_helpers';
import { createDuplicate } from '../../lib/dom/duplicate_helpers';
import { findNearHandle, startResize, applyResizeMove } from '../../lib/dom/resize_helpers';
import type { InteractionState } from '../../lib/dom/interaction_state';
import { IDLE, deriveCursor } from '../../lib/dom/interaction_state';
import { EditOutline } from './outline';
import { EditModal } from './modal/edit_modal';
import type { StyleChange, TextNodeChange } from './modal/edit_modal';
import { hasSignificantRounding, isInRoundedDeadZone } from '../../lib/dom/rounded_dead_zone';

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
  const [editModalTarget, setEditModalTarget] = useState<HTMLElement | null>(null);

  const interaction = useRef<InteractionState>(IDLE);
  const registry = useRef(new ElementRegistry());
  const rafId = useRef<number>(0);
  const styleEdits = useRef<Array<{ element: HTMLElement; property: string; original: string }>>(
    []
  );
  const textEdits = useRef<Array<{ node: Text; original: string }>>([]);
  const roundedTargets = useRef(new WeakSet<HTMLElement>());

  const updateCursor = useCallback(
    (next: string) => setCursor((prev) => (prev === next ? prev : next)),
    []
  );

  const { isInsideHoverLock, clearLock } = useHoverLock(hoverTarget);

  const { deleteElement: rawDeleteElement, restoreAll } = useDeleteElement();

  const notifyCount = useCallback(() => {
    const hiddenOriginals = document.querySelectorAll(`[${DEVTOOL_HIDDEN_ATTR}]`).length;
    const duplicates = [...registry.current.values()].filter((s) => s.isDuplicate).length;
    onChangeCount?.(
      hiddenOriginals + duplicates + styleEdits.current.length + textEdits.current.length
    );
  }, [onChangeCount]);

  const deleteElement = useCallback(
    (el: HTMLElement) => {
      const session = registry.current.get(el);

      if (session) {
        registry.current.removeSession(session);
      } else {
        rawDeleteElement(el);
      }

      setHoverTarget(null);
      clearLock();
      setCursor('');
      notifyCount();
    },
    [rawDeleteElement, clearLock, notifyCount]
  );

  const resetAll = useCallback(() => {
    if (interaction.current.type === 'drag') {
      interaction.current.session.el.remove();
    }
    interaction.current = IDLE;
    registry.current.resetAll();
    restoreAll();
    for (const { element, property, original } of styleEdits.current) {
      element.style.setProperty(property, original);
    }
    styleEdits.current = [];
    for (const { node, original } of textEdits.current) {
      node.textContent = original;
    }
    textEdits.current = [];
    onChangeCount?.(0);
  }, [onChangeCount, restoreAll]);

  useImperativeHandle(handleRef, () => ({ resetAll }), [resetAll]);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const state = interaction.current;

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

          default: {
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
            const nextTarget = getElementUnder(event.clientX, event.clientY);

            // When the cursor leaves a rounded element (e.g. border-radius: 50%)
            // it exits the hit-testable shape before reaching the bounding-rect
            // corners where resize handles live. Keep the current hover target
            // while the cursor is in the edge zone of its bounding rect, so the
            // user can reach the resize handles in the dead zone between the
            // rounded edge and the rect corners.
            // Skip when the new target is a child — the cursor moved to a
            // descendant, not a dead zone.
            if (hoverTarget && nextTarget !== hoverTarget) {
              const isChild = nextTarget && hoverTarget.contains(nextTarget);

              if (
                !isChild &&
                roundedTargets.current.has(hoverTarget) &&
                isInRoundedDeadZone(
                  event.clientX,
                  event.clientY,
                  hoverTarget.getBoundingClientRect()
                )
              ) {
                const foundHandle = detectHandle(event.clientX, event.clientY, hoverTarget);
                if (!foundHandle) {
                  interaction.current = IDLE;
                }
                updateCursor(deriveCursor(interaction.current, hoverTarget));
                return;
              }

              if (detectHandle(event.clientX, event.clientY, hoverTarget)) {
                return;
              }
            }

            if (nextTarget) {
              if (hasSignificantRounding(nextTarget)) {
                roundedTargets.current.add(nextTarget);
              }
            }

            const nextCursor = nextTarget ? 'grab' : '';
            setHoverTarget((prev) => (prev === nextTarget ? prev : nextTarget));
            updateCursor(nextCursor);
          }
        }
      });
    },
    [
      layoutConfig,
      isLayoutVisible,
      toolbarHeight,
      notifyCount,
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
        setHoverTarget(null);
        updateCursor(deriveCursor(interaction.current, null));
        notifyCount();
        return;
      }

      const target = getElementUnder(event.clientX, event.clientY);
      if (!target) return;

      event.preventDefault();
      event.stopPropagation();
      // Prevent native drag from stealing the pointer (fires pointercancel)
      (event.target as Element)?.setPointerCapture?.(event.pointerId);

      const existingSession = findManagedSession(target, registry.current);

      if (existingSession) {
        interaction.current = startDragFromSession(existingSession, event.clientX, event.clientY);
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
      updateCursor(deriveCursor(interaction.current, null));
      notifyCount();
    },
    [zIndex.clone, notifyCount, updateCursor]
  );

  const parkInteraction = useCallback(() => {
    const state = interaction.current;
    if (state.type !== 'drag' && state.type !== 'resize') return;

    state.session.el.style.pointerEvents = 'auto';
    interaction.current = IDLE;
    setCursor((prev) => (prev === 'grab' ? prev : 'grab'));
  }, []);

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      const state = interaction.current;
      if (state.type !== 'drag' && state.type !== 'resize') return;
      event.preventDefault();
      event.stopPropagation();
      (event.target as Element)?.releasePointerCapture?.(event.pointerId);
      parkInteraction();
    },
    [parkInteraction]
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

      if (isDeleteKey(event) && hoverTarget) {
        event.preventDefault();
        event.stopPropagation();
        deleteElement(hoverTarget);
      }
    },
    [setIsEditMode, hoverTarget, deleteElement]
  );

  const handleClick = useCallback((event: MouseEvent) => {
    const target = getElementUnder(event.clientX, event.clientY);
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
  }, []);

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

  const listenersActive = isActive && !editModalTarget;

  useEditListeners(
    listenersActive,
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

  const lockedTarget = useLockedTarget(hoverTarget, !!showOutline);

  const handleDelete = useCallback(() => {
    if (!hoverTarget) return;
    deleteElement(hoverTarget);
  }, [hoverTarget, deleteElement]);

  const handleEdit = useCallback((target: HTMLElement) => {
    setEditModalTarget(target);
    setCursor('');
    setHoverTarget(null);
  }, []);

  const handleEditClose = useCallback(() => {
    setEditModalTarget(null);
  }, []);

  const handleEditSave = useCallback(
    (savedStyleChanges: StyleChange[], savedTextChanges: TextNodeChange[]) => {
      // Apply style changes
      for (const { element, property, value } of savedStyleChanges) {
        const cssProp = property.replace(/([A-Z])/g, '-$1').toLowerCase();
        const original = element.style.getPropertyValue(cssProp);
        styleEdits.current.push({ element, property: cssProp, original });
        element.style.setProperty(cssProp, value);
      }

      // Apply text node changes
      for (const { node, text, color: textColor } of savedTextChanges) {
        if (text !== undefined) {
          textEdits.current.push({ node, original: node.textContent ?? '' });
          node.textContent = text;
        }
        if (textColor !== undefined && node.parentElement) {
          const parent = node.parentElement;
          const original = parent.style.color;
          styleEdits.current.push({ element: parent, property: 'color', original });
          parent.style.color = textColor;
        }
      }

      setEditModalTarget(null);
      notifyCount();
    },
    [notifyCount]
  );

  const handleDuplicate = useCallback(() => {
    if (!hoverTarget) return;

    const duplicate = createDuplicate(hoverTarget, registry.current, zIndex.clone);
    setHoverTarget(duplicate);
    clearLock();
    notifyCount();
  }, [hoverTarget, zIndex.clone, clearLock, notifyCount]);

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
