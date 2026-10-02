/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AT_TOOLTIP_SELECTOR } from '../constants';
import {
  TOOLTIP_GAP,
  gapBetween,
  isIgnored,
  isVisible,
  promoteToCommentable,
  tooltipShowing,
  tooltipsShowing,
  triggerOf,
} from './anchor';
import type { Box, Point } from './anchor';

/** Events by which elements learn of the pointer entering and leaving them. */
export const BOUNDARY_EVENTS = [
  'mouseover',
  'mouseout',
  'mouseenter',
  'mouseleave',
  'pointerover',
  'pointerout',
  'pointerenter',
  'pointerleave',
] as const;

/** Events by which elements learn of the pointer moving over them. */
export const MOVE_EVENTS = ['pointermove', 'mousemove'] as const;

/** Events by which elements learn of focus coming and going. */
export const FOCUS_EVENTS = ['focus', 'blur', 'focusin', 'focusout'] as const;

/** How much farther from the tooltip the pointer may get on its way there, for an unsteady hand. */
const SLACK = 16;

const boxOf = (element: Element): Box => element.getBoundingClientRect();

const isEmpty = ({ left, top, right, bottom }: Box): boolean => right <= left || bottom <= top;

const union = (a: Box, b: Box): Box => ({
  left: Math.min(a.left, b.left),
  top: Math.min(a.top, b.top),
  right: Math.max(a.right, b.right),
  bottom: Math.max(a.bottom, b.bottom),
});

const contains = ({ left, top, right, bottom }: Box, { x, y }: Point): boolean =>
  x >= left && x <= right && y >= top && y <= bottom;

/** How far the point is from the box; 0 within it. */
const distanceFrom = ({ left, top, right, bottom }: Box, { x, y }: Point): number =>
  Math.hypot(Math.max(left - x, 0, x - right), Math.max(top - y, 0, y - bottom));

/** Whether the pointer, leaving the element at `point`, went out of the side facing the tooltip (any side, when the two overlap). */
const facing = (element: Box, tooltip: Box, { x, y }: Point): boolean => {
  if (tooltip.top >= element.bottom) {
    return y >= element.bottom - SLACK;
  }
  if (tooltip.bottom <= element.top) {
    return y <= element.top + SLACK;
  }
  if (tooltip.left >= element.right) {
    return x >= element.right - SLACK;
  }
  if (tooltip.right <= element.left) {
    return x <= element.left + SLACK;
  }
  return true;
};

/** Whether the node is of the layer's UI at a tooltip: a pin, the thread, the composer. */
const isAtTooltip = (node: EventTarget | null): node is Element =>
  node instanceof Element && node.closest(AT_TOOLTIP_SELECTOR) !== null;

/** The tooltip along with the layer's UI at it, as one box. */
const areaOf = (tooltip: Element): Box =>
  Array.from(document.querySelectorAll(AT_TOOLTIP_SELECTOR))
    .map(boxOf)
    .filter((box) => !isEmpty(box))
    .reduce(union, boxOf(tooltip));

/** The tooltip showing that the point is on or within reach of, the layer's UI at it included. */
const tooltipNear = (point: Point, ignoreSelectors: readonly string[]): Element | null =>
  tooltipsShowing(ignoreSelectors).find(
    (tooltip) => distanceFrom(areaOf(tooltip), point) <= SLACK
  ) ?? null;

const pointOf = (event: MouseEvent): Point => ({ x: event.clientX, y: event.clientY });

const live = (element: Element | null | undefined): Element | null =>
  element?.isConnected ? element : null;

/** The events React derives entering and leaving from: a tooltip's trigger shows and hides it on these. */
const bubbles = (type: string): boolean =>
  type.endsWith('over') || type.endsWith('out') || type === 'focusout';

const isLeave = (type: string): boolean => type.endsWith('out') || type.endsWith('leave');

interface Held {
  type: string;
  target: Element;
}

const record = (held: Held[], type: string, target: Element) => {
  if (!held.some((event) => event.type === type && event.target === target)) {
    held.push({ type, target });
  }
};

export interface TooltipHold {
  /** Takes a boundary event of the page or of the layer's UI at a tooltip; whether it was held back from the page. */
  hold(event: MouseEvent, ignoreSelectors: readonly string[]): boolean;
  /** Takes a move of the pointer, ending the hold once it has turned away; whether the move was held back from the page under the tooltip. */
  move(event: MouseEvent, ignoreSelectors: readonly string[]): boolean;
  /** Takes a focus event; whether it was held back from the page: focus going from the element showing the tooltip into the layer's UI at it. */
  focus(event: FocusEvent, ignoreSelectors: readonly string[]): boolean;
  /** Ends the pointer hold: the page learns of the pointer's going, to the element at `point` if given. */
  release(point?: Point): void;
  /** Ends the holds, the focus one too: the page learns of focus's going, to where it is. */
  end(): void;
  /** The element that shows the tooltip held, when known. */
  trigger(): Element | null;
}

/**
 * A tooltip goes as the pointer or focus leaves its element, and takes no
 * pointer input: to be clicked, and commented on, it has to be kept showing
 * while the pointer crosses over to it, and while the layer's UI at it has
 * focus. The pointer hold starts as the pointer goes out of an element through
 * the side facing the tooltip it shows, or onto a tooltip from elsewhere, and
 * lasts while the pointer keeps nearing the tooltip, is on it or on the layer's
 * UI at it, or is back on the element. The focus hold lasts while focus, gone
 * from the element into that UI, stays in the layer's. Meanwhile the page is
 * told nothing: not of the element being left, nor of what is under the
 * tooltip, which the tooltip covers, being entered or moved over (EUI shows one
 * tooltip at a time, so another trigger entered would take the tooltip down).
 * As the pointer turns away, or focus lands on the page, the element learns of
 * the leave, to where the pointer or focus is then.
 */
export const createTooltipHold = (): TooltipHold => {
  let pointer: {
    /** The element the page knows the pointer to be on. */
    origin: Element;
    tooltip: Element;
    trigger: Element | null;
    held: Held[];
    /** Nearest the pointer has been to the tooltip. */
    closest: number;
    ignoreSelectors: readonly string[];
  } | null = null;
  let focused: {
    /** The element the page knows focus to be on. */
    trigger: Element;
    held: Held[];
  } | null = null;
  let releasing = false;

  const keeps = (point: Point): boolean => {
    if (!pointer) {
      return false;
    }
    const { origin, tooltip } = pointer;
    if (!origin.isConnected || !tooltip.isConnected || !isVisible(tooltip)) {
      return false;
    }
    if (contains(boxOf(origin), point)) {
      return true;
    }
    const distance = distanceFrom(areaOf(tooltip), point);
    if (distance > pointer.closest + SLACK) {
      return false;
    }
    pointer.closest = Math.min(pointer.closest, distance);
    return true;
  };

  /** The page element under the point, unless the layer's UI is there. */
  const pageElementAt = ({ x, y }: Point, ignoreSelectors: readonly string[]): Element | null => {
    const [top] = document.elementsFromPoint(x, y);
    return top && !isIgnored(top, ignoreSelectors) ? top : null;
  };

  const replay = (
    held: Held[],
    to: Element | null,
    Event: typeof MouseEvent | typeof FocusEvent
  ) => {
    releasing = true;
    try {
      held.forEach(({ type, target }) => {
        if (target.isConnected) {
          target.dispatchEvent(new Event(type, { bubbles: bubbles(type), relatedTarget: to }));
        }
      });
    } finally {
      releasing = false;
    }
  };

  const releasePointer = (point?: Point) => {
    if (!pointer) {
      return;
    }
    const { held, ignoreSelectors } = pointer;
    pointer = null;
    replay(held, point ? pageElementAt(point, ignoreSelectors) : null, MouseEvent);
  };

  const releaseFocus = (to: Element | null) => {
    if (!focused) {
      return;
    }
    const { held } = focused;
    focused = null;
    replay(held, to, FocusEvent);
  };

  return {
    hold(event, ignoreSelectors) {
      const { target, relatedTarget } = event;
      if (releasing || !(target instanceof Element)) {
        return false;
      }
      const point = pointOf(event);
      if (pointer && !keeps(point)) {
        releasePointer(point);
      }
      const atUi = isAtTooltip(target);
      if (!atUi && isIgnored(target, ignoreSelectors)) {
        return false;
      }
      if (!pointer) {
        if (atUi || !isLeave(event.type)) {
          return false;
        }
        const origin = promoteToCommentable(target);
        const tooltip =
          tooltipShowing(origin, ignoreSelectors) ?? tooltipNear(point, ignoreSelectors);
        if (!tooltip) {
          return false;
        }
        const [originBox, tooltipBox, area] = [boxOf(origin), boxOf(tooltip), areaOf(tooltip)];
        const towards =
          gapBetween(originBox, tooltipBox) <= TOOLTIP_GAP && facing(originBox, tooltipBox, point);
        const onto = isAtTooltip(relatedTarget) || distanceFrom(area, point) <= SLACK;
        if (!towards && !onto) {
          return false;
        }
        pointer = {
          origin,
          tooltip,
          trigger: triggerOf(tooltip) ?? (towards ? origin : (focused?.trigger ?? null)),
          held: [],
          closest: distanceFrom(area, point),
          ignoreSelectors,
        };
      }
      const { origin, held } = pointer;
      if (isLeave(event.type) && origin.contains(target)) {
        record(held, event.type, target);
      } else if (!bubbles(event.type) && !atUi) {
        // Entering and leaving elsewhere on the page, as told to the elements themselves: not React's.
        return false;
      }
      event.stopPropagation();
      return true;
    },

    move(event, ignoreSelectors) {
      const point = pointOf(event);
      if (pointer && !keeps(point)) {
        releasePointer(point);
      }
      const { target } = event;
      if (
        !pointer ||
        !(target instanceof Element) ||
        pointer.origin.contains(target) ||
        isAtTooltip(target) ||
        isIgnored(target, ignoreSelectors)
      ) {
        return false;
      }
      event.stopPropagation();
      return true;
    },

    focus(event, ignoreSelectors) {
      const { target, relatedTarget, type } = event;
      if (releasing || !(target instanceof Element)) {
        return false;
      }
      if (type === 'focus' || type === 'focusin') {
        // Focus on the page again: where the page believes it to be, or elsewhere, which it learns of now.
        if (focused && !isIgnored(target, ignoreSelectors)) {
          if (focused.trigger.contains(target)) {
            focused = null;
          } else {
            releaseFocus(target);
          }
        }
        return false;
      }
      if (!focused) {
        if (
          isIgnored(target, ignoreSelectors) ||
          !isAtTooltip(relatedTarget) ||
          !tooltipShowing(target, ignoreSelectors)
        ) {
          return false;
        }
        focused = { trigger: target, held: [] };
      } else if (!focused.trigger.contains(target)) {
        return false;
      }
      record(focused.held, type, target);
      event.stopPropagation();
      return true;
    },

    release: releasePointer,

    end() {
      releasePointer();
      const active = document.activeElement;
      if (focused && active && focused.trigger.contains(active)) {
        focused = null;
      } else {
        releaseFocus(active instanceof Element && active !== document.body ? active : null);
      }
    },

    trigger: () => live(pointer?.trigger) ?? live(focused?.trigger),
  };
};
