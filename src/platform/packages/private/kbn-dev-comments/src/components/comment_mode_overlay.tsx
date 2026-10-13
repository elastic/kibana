/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Global, css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { IGNORE_SELECTOR } from '../constants';
import {
  isIgnored,
  isVisible,
  promoteToCommentable,
  tooltipAt,
  tooltipShowing,
  triggerOf,
} from '../lib/anchor';
import type { Point } from '../lib/anchor';
import { holdsPassThrough, isPassingThrough, passThrough } from '../lib/pass_through';
import { BOUNDARY_EVENTS, FOCUS_EVENTS, MOVE_EVENTS, createTooltipHold } from '../lib/tooltip_hold';
import { useComments, useCommentsState } from './comments_context';
import { useLayerPortal, useLayerZIndex, useLayoutTick } from './hooks';

const POINTER_EVENTS = [
  'pointerdown',
  'pointerup',
  'mousedown',
  'mouseup',
  'click',
  'dblclick',
] as const;

/** Ways of changing a field's value other than key presses. */
const INPUT_EVENTS = ['beforeinput', 'paste', 'cut', 'drop'] as const;

/** Keys that select the focused element, or the tooltip aimed at, as the comment's target. */
const SELECT_KEYS = ['Enter', ' '];

/** Keys that aim at the tooltip the focused element shows, and back at the element. */
const AIM_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

/** Keys that keep working on the page: moving focus, leaving comment mode, and browser or application shortcuts. */
const passesThrough = (event: KeyboardEvent): boolean =>
  event.key === 'Tab' ||
  event.key === 'Escape' ||
  event.metaKey ||
  event.ctrlKey ||
  event.altKey ||
  /^F\d{1,2}$/.test(event.key);

const centerOf = (element: Element) => {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { x: left + width / 2, y: top + height / 2 };
};

// Speech bubble with a plus; the hotspot is the bubble's tail.
const CURSOR_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">' +
  '<path d="M6 2h13a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H9l-6 5V5a3 3 0 0 1 3-3z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
  '<path d="M12.5 6.5v6M9.5 9.5h6" stroke="#000" stroke-width="1.5" stroke-linecap="round"/>' +
  '</svg>';
const COMMENT_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  CURSOR_SVG
)}") 3 22, crosshair`;

interface Aim {
  /** The focused element, showing the tooltip. */
  trigger: Element;
  tooltip: Element;
}

/** Outlines the tooltip aimed at with the keyboard, while it shows. */
const TooltipAim = ({ tooltip, onGone }: { tooltip: Element; onGone: () => void }) => {
  const { euiTheme } = useEuiTheme();
  const zIndex = useLayerZIndex();
  const container = useLayerPortal('devCommentsTooltipAim', zIndex.tooltipPins);
  useLayoutTick();
  const showing = tooltip.isConnected && isVisible(tooltip);

  useEffect(() => {
    if (!showing) {
      onGone();
    }
  }, [showing, onGone]);

  if (!container || !showing) {
    return null;
  }
  const { left, top, width, height } = tooltip.getBoundingClientRect();
  return createPortal(
    <div
      css={css`
        position: fixed;
        left: ${left}px;
        top: ${top}px;
        width: ${width}px;
        height: ${height}px;
        outline: ${euiTheme.border.width.thick} solid ${euiTheme.colors.primary};
        outline-offset: ${euiTheme.size.xs};
        border-radius: ${euiTheme.border.radius.small};
        pointer-events: none;
      `}
      aria-hidden={true}
      data-test-subj="devCommentsTooltipAim"
    />,
    container
  );
};

/**
 * Comment mode: pointer and keyboard input to the page is swallowed in the
 * capture phase, so the UI state being commented on does not change. Releasing
 * the pointer on an element starts a comment (or moves the one being written);
 * so do Enter and Space on the focused element. A tooltip stays showing while
 * the pointer heads over to it, to be clicked, and while the layer's UI at it
 * has focus, the page meanwhile told nothing of the pointer or focus; with the
 * keyboard, an arrow key aims at the tooltip the focused element shows. With
 * Alt held, pointer input goes to the page. A full-screen screenshot gets it
 * too: this stays mounted, so a tooltip the comment is on keeps showing, while
 * pointer and key input reach the screenshot.
 */
export const CommentModeOverlay = () => {
  const controller = useComments();
  const { ignoreSelectors } = controller;
  const [altHeld, setAltHeld] = useState(false);
  const [aim, setAim] = useState<Aim | null>(null);
  const aimRef = useRef(aim);
  aimRef.current = aim;
  const clearAim = useCallback(() => setAim(null), []);
  const hold = useMemo(createTooltipHold, []);
  // Unmounting to let the screenshot through would end the hold, and a tooltip the comment is on would go.
  const overlayOpen = useCommentsState((state) => state.overlayOpen);
  const overlayOpenRef = useRef(false);
  overlayOpenRef.current = overlayOpen;
  useLayoutEffect(() => {
    hold.suspend(overlayOpen);
  }, [hold, overlayOpen]);
  // EUI draws a tooltip at the toasts' level, over the screenshot's mask. Tuck it under the mask; it stays, so the comment does.
  const { euiTheme } = useEuiTheme();
  useLayoutEffect(() => {
    if (!overlayOpen) {
      return;
    }
    const underMask = String(Number(euiTheme.levels.mask) - 1);
    const previous: Array<[HTMLElement, string]> = [];
    document.querySelectorAll('[role="tooltip"]').forEach((tooltip) => {
      if (tooltip instanceof HTMLElement) {
        previous.push([tooltip, tooltip.style.zIndex]);
        tooltip.style.zIndex = underMask;
      }
    });
    return () => {
      previous.forEach(([tooltip, zIndex]) => {
        tooltip.style.zIndex = zIndex;
      });
    };
  }, [overlayOpen, euiTheme.levels.mask]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => setAltHeld(event.altKey);
    // Released elsewhere (Alt+Tab): no keyup comes.
    const release = () => setAltHeld(false);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKey, true);
      window.removeEventListener('blur', release);
    };
  }, []);

  const cursorStyles = useMemo(() => {
    const roots = [IGNORE_SELECTOR, ...ignoreSelectors];
    const ignored = roots.flatMap((selector) => [selector, `${selector} *`]).join(', ');
    return css`
      html,
      body,
      body *:not(${ignored}) {
        cursor: ${COMMENT_CURSOR} !important;
      }
      :where(${roots.join(', ')}) {
        cursor: auto;
      }
    `;
  }, [ignoreSelectors]);

  useEffect(() => {
    const pageTarget = (event: Event): Element | null => {
      const { target } = event;
      return target instanceof Element && !isIgnored(target, ignoreSelectors) ? target : null;
    };

    const pickTooltip = (tooltip: Element, point: Point, hit: Element, trigger: Element | null) =>
      controller.pick(tooltip, point, hit, trigger ? { revealedBy: trigger } : undefined);

    // A tooltip at the spot takes no pointer input but is what is seen there: the comment goes on it.
    const pickAt = (target: Element, point: Point) => {
      const shown = tooltipAt(point, ignoreSelectors);
      if (shown) {
        pickTooltip(shown.tooltip, point, shown.hit, hold.trigger() ?? triggerOf(shown.tooltip));
      } else {
        controller.pick(promoteToCommentable(target), point, target);
      }
    };

    const onPointer = (event: Event) => {
      if (overlayOpenRef.current) {
        return;
      }
      const target = pageTarget(event);
      if (!target || isPassingThrough()) {
        return;
      }
      if (event instanceof MouseEvent && holdsPassThrough(event)) {
        if (event.type === 'click') {
          event.preventDefault();
          event.stopPropagation();
          passThrough(event);
        }
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      // On the pointer's release: a disabled control gets no click, and clicks the page synthesizes come without a pointer.
      if (event.type === 'pointerup' && event instanceof MouseEvent && event.button === 0) {
        pickAt(target, { x: event.clientX, y: event.clientY });
      }
    };

    // With Alt held, the pointer's whereabouts are the page's too: a tooltip held goes, as it would.
    const onBoundary = (event: Event) => {
      if (!(event instanceof MouseEvent)) {
        return;
      }
      if (!overlayOpenRef.current && holdsPassThrough(event)) {
        hold.release({ x: event.clientX, y: event.clientY });
      } else {
        hold.hold(event, ignoreSelectors);
      }
    };

    const onMove = (event: Event) => {
      if (!(event instanceof MouseEvent)) {
        return;
      }
      if (!overlayOpenRef.current && holdsPassThrough(event)) {
        hold.release({ x: event.clientX, y: event.clientY });
      } else {
        hold.move(event, ignoreSelectors);
      }
    };

    const onFocusChange = (event: Event) => {
      if (event instanceof FocusEvent) {
        hold.focus(event, ignoreSelectors);
      }
    };

    const onInput = (event: Event) => {
      if (overlayOpenRef.current) {
        return;
      }
      if (pageTarget(event)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const onKey = (event: KeyboardEvent) => {
      if (overlayOpenRef.current) {
        return;
      }
      const target = pageTarget(event);
      if (!target || passesThrough(event)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (
        event.type !== 'keydown' ||
        target === document.body ||
        target === document.documentElement
      ) {
        return;
      }
      const aimed = aimRef.current?.trigger === target ? aimRef.current : null;
      if (AIM_KEYS.includes(event.key)) {
        const tooltip = aimed ? null : tooltipShowing(target, ignoreSelectors);
        setAim(tooltip ? { trigger: target, tooltip } : null);
      } else if (SELECT_KEYS.includes(event.key)) {
        if (aimed && aimed.tooltip.isConnected && isVisible(aimed.tooltip)) {
          const { tooltip } = aimed;
          pickTooltip(tooltip, centerOf(tooltip), tooltip, promoteToCommentable(target));
        } else {
          controller.pick(promoteToCommentable(target), centerOf(target), target);
        }
      }
    };

    POINTER_EVENTS.forEach((type) => document.addEventListener(type, onPointer, true));
    BOUNDARY_EVENTS.forEach((type) => document.addEventListener(type, onBoundary, true));
    MOVE_EVENTS.forEach((type) => document.addEventListener(type, onMove, true));
    FOCUS_EVENTS.forEach((type) => document.addEventListener(type, onFocusChange, true));
    INPUT_EVENTS.forEach((type) => document.addEventListener(type, onInput, true));
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('keyup', onKey, true);
    // The aim is the focused element's.
    document.addEventListener('focusin', clearAim, true);
    return () => {
      POINTER_EVENTS.forEach((type) => document.removeEventListener(type, onPointer, true));
      BOUNDARY_EVENTS.forEach((type) => document.removeEventListener(type, onBoundary, true));
      MOVE_EVENTS.forEach((type) => document.removeEventListener(type, onMove, true));
      FOCUS_EVENTS.forEach((type) => document.removeEventListener(type, onFocusChange, true));
      INPUT_EVENTS.forEach((type) => document.removeEventListener(type, onInput, true));
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('keyup', onKey, true);
      document.removeEventListener('focusin', clearAim, true);
      hold.end();
    };
  }, [controller, ignoreSelectors, hold, clearAim]);

  return (
    <>
      {!altHeld && !overlayOpen && <Global styles={cursorStyles} />}
      {aim && <TooltipAim tooltip={aim.tooltip} onGone={clearAim} />}
    </>
  );
};
