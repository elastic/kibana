/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MutableRefObject } from 'react';
import { useCallback, useMemo, useRef } from 'react';
import { HANDLE_CURSORS } from '../lib/constants';
import {
  findManagedSession,
  startDragFromSession,
  startDragFromElement,
  applyDragMove,
} from './drag_helpers';
import { startResize, applyResizeMove } from './resize_helpers';
import type { InteractionState, DragState, GestureCompletion } from './interaction_state';
import { IDLE, deriveCursor } from './interaction_state';
import { resolveHoverTarget } from './resolve_hover_target';
import { getElementUnder } from '../lib/dom/get_element_under';
import type { ElementRegistry, ElementSession } from './element_registry';
import type { LayoutConfig } from '../lib/layout/layout_config';

/**
 * Side-effects produced by interaction state transitions.
 *
 * The interaction machine is intentionally decoupled from React state.
 * It communicates state changes back to the component via this callback
 * interface so the component can bridge them into React (setCursor, etc.).
 */
interface InteractionEffects {
  setCursor: (cursor: string) => void;
  updateHoverTarget: (target: HTMLElement | null) => void;
  notifyCount: () => void;
}

export interface InteractionMachineOptions {
  registry: MutableRefObject<ElementRegistry>;
  hoverTargetRef: MutableRefObject<HTMLElement | null>;
  stickyHover: MutableRefObject<HTMLElement | null>;
  roundedTargets: MutableRefObject<WeakSet<HTMLElement>>;
  rafId: MutableRefObject<number>;
  effects: InteractionEffects;
  isInsideHoverLock: (x: number, y: number) => boolean;
  cloneZIndex: number;
}

/**
 * Encapsulates the pointer interaction state machine for the edit overlay.
 *
 * Manages transitions between idle → hover → pending-drag → drag → resize,
 * and exposes handler functions for pointer events. The state lives in a ref
 * (not React state) because pointer-move handlers fire every frame.
 *
 * See `InteractionState` for the full state diagram.
 *
 * @param options - Configuration for the interaction machine.
 * @returns Pointer event handlers and current interaction state.
 */
export const useInteractionMachine = (options: InteractionMachineOptions) => {
  const interaction = useRef<InteractionState>(IDLE);
  const newCloneRef = useRef<HTMLElement | undefined>(undefined);

  const { registry, hoverTargetRef, stickyHover, roundedTargets, rafId, effects } = options;
  const { cloneZIndex, isInsideHoverLock } = options;

  /** Read the current interaction state (ref value). */
  const getState = useCallback((): InteractionState => interaction.current, []);

  /**
   * Transition: park (drag|resize) → idle.
   * Restores pointer-events and clears GPU compositing hints.
   */
  const parkInteraction = useCallback(() => {
    const state = interaction.current;
    if (state.type !== 'drag' && state.type !== 'resize') return;

    state.session.el.style.pointerEvents = 'auto';
    // Clear will-change so the element leaves its GPU-composited layer.
    // Leaving will-change:'transform' after drag/resize disables subpixel
    // antialiasing and causes visibly blurry text.
    state.session.el.style.willChange = '';
    interaction.current = IDLE;
    effects.setCursor('grab');
  }, [effects]);

  /**
   * Transition: any active gesture → idle.
   * Safe to call at any time (e.g. blur, visibility change).
   */
  const abortDrag = useCallback(() => {
    if (interaction.current.type === 'pending-drag') {
      interaction.current = IDLE;
    }
    parkInteraction();
  }, [parkInteraction]);

  /**
   * Handle pointer-move: applies drag/resize frames, promotes
   * pending-drag to drag, or resolves hover targets.
   */
  const handlePointerMove = useCallback(
    (event: PointerEvent, layoutConfig: LayoutConfig, isLayoutVisible: boolean) => {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const state = interaction.current;
        const currentHover = hoverTargetRef.current;

        switch (state.type) {
          case 'resize': {
            applyResizeMove(state, event.clientX, event.clientY);
            effects.notifyCount();
            break;
          }

          case 'drag': {
            applyDragMove(state, event.clientX, event.clientY, event.shiftKey, {
              isLayoutVisible,
              layoutConfig,
            });
            effects.notifyCount();
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
                cloneZIndex,
                state.startX,
                state.startY
              );
              newCloneRef.current = (interaction.current as DragState).session.referenceEl;
            }
            effects.setCursor('grabbing');
            effects.notifyCount();
            // Apply the move that triggered promotion
            applyDragMove(
              interaction.current as DragState,
              event.clientX,
              event.clientY,
              event.shiftKey,
              { isLayoutVisible, layoutConfig }
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
              effects.setCursor(HANDLE_CURSORS[resolution.handle]);
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
              effects.setCursor('grab');
              return;
            }

            // When in rounded dead-zone with no handle, derive cursor from idle state
            if (resolution.target === currentHover && currentHover) {
              effects.setCursor(deriveCursor(IDLE, currentHover));
              return;
            }

            effects.updateHoverTarget(resolution.target);
            effects.setCursor(resolution.target ? 'grab' : '');
          }
        }
      });
    },
    [
      registry,
      hoverTargetRef,
      stickyHover,
      roundedTargets,
      rafId,
      effects,
      cloneZIndex,
      isInsideHoverLock,
    ]
  );

  /**
   * Handle pointer-down: initiates resize from a hovered handle, or
   * enters pending-drag for a targetable element.
   */
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
        (event.target as Element)?.setPointerCapture?.(event.pointerId);

        let session = registry.current.get(state.target);
        if (!session) {
          const dragState = startDragFromElement(
            state.target,
            registry.current,
            cloneZIndex,
            event.clientX,
            event.clientY
          );
          session = dragState.session;
          session.el.style.pointerEvents = 'auto';
          newCloneRef.current = session.referenceEl;
        }

        interaction.current = startResize(session, corner, event.clientX, event.clientY);
        effects.updateHoverTarget(null);
        effects.setCursor(deriveCursor(interaction.current, null));
        effects.notifyCount();
        return;
      }

      const target = getElementUnder(event.clientX, event.clientY);
      if (!target) return;

      event.preventDefault();
      event.stopPropagation();
      (event.target as Element)?.setPointerCapture?.(event.pointerId);

      // Don't start a real drag yet. Wait for the pointer to move beyond
      // a minimum threshold so that plain clicks don't create clones.
      interaction.current = {
        type: 'pending-drag',
        target,
        startX: event.clientX,
        startY: event.clientY,
      };

      effects.updateHoverTarget(null);
      effects.setCursor('grab');
      effects.notifyCount();
    },
    [registry, effects, parkInteraction, cloneZIndex]
  );

  /**
   * Handle pointer-up: finalises drag/resize or cancels pending-drag.
   */
  const handlePointerUp = useCallback(
    (event: PointerEvent): GestureCompletion | null => {
      const state = interaction.current;

      let completion: GestureCompletion | null = null;

      if (state.type === 'pending-drag') {
        interaction.current = IDLE;
        (event.target as Element)?.releasePointerCapture?.(event.pointerId);
      } else if (state.type === 'drag') {
        event.preventDefault();
        event.stopPropagation();
        (event.target as Element)?.releasePointerCapture?.(event.pointerId);

        const { session, baseOffsetX, baseOffsetY } = state;
        const isNewClone = newCloneRef.current === session.referenceEl;
        newCloneRef.current = undefined;

        completion = {
          gesture: 'move',
          target: session.el,
          before: { dx: baseOffsetX, dy: baseOffsetY },
          after: { dx: session.dx, dy: session.dy },
          isNewClone: isNewClone && !!session.referenceEl,
          referenceEl: session.referenceEl,
          session,
        };

        parkInteraction();
      } else if (state.type === 'resize') {
        event.preventDefault();
        event.stopPropagation();
        (event.target as Element)?.releasePointerCapture?.(event.pointerId);

        const { session, baseDx, baseDy, baseWidth, baseHeight } = state;
        const beforeDw = baseWidth - session.originalRect.width;
        const beforeDh = baseHeight - session.originalRect.height;

        completion = {
          gesture: 'resize',
          target: session.el,
          before: { dx: baseDx, dy: baseDy, dw: beforeDw, dh: beforeDh },
          after: { dx: session.dx, dy: session.dy, dw: session.dw, dh: session.dh },
        };

        parkInteraction();
      } else {
        return null;
      }

      // Re-resolve hover so the outline shows immediately
      const target = getElementUnder(event.clientX, event.clientY);
      effects.updateHoverTarget(target);
      effects.setCursor(target ? 'grab' : '');

      return completion;
    },
    [parkInteraction, effects]
  );

  /**
   * Start dragging an existing managed session (used for duplicate-and-drag).
   */
  const startSessionDrag = useCallback((session: ElementSession, cx: number, cy: number) => {
    interaction.current = startDragFromSession(session, cx, cy);
  }, []);

  /**
   * Force-reset the interaction state to idle.
   * Used when the overlay is deactivated or all edits are reset.
   */
  const forceIdle = useCallback(() => {
    interaction.current = IDLE;
  }, []);

  return useMemo(
    () => ({
      getState,
      interaction,
      parkInteraction,
      abortDrag,
      handlePointerMove,
      handlePointerDown,
      handlePointerUp,
      startSessionDrag,
      forceIdle,
    }),
    [
      getState,
      parkInteraction,
      abortDrag,
      handlePointerMove,
      handlePointerDown,
      handlePointerUp,
      startSessionDrag,
      forceIdle,
    ]
  );
};
