/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AT_TOOLTIP_SELECTOR } from '../constants';
import { isIgnored, isVisible, promoteToCommentable, tooltipShowing, triggerOf } from './anchor';
import type { Point } from './anchor';

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

/** Farthest a tooltip is shown from its element (EUI keeps 16px). */
const MAX_GAP = 32;
/** How much farther from the tooltip the pointer may get on its way there, for an unsteady hand. */
const SLACK = 16;

type Box = Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'>;

const boxOf = (element: Element): Box => element.getBoundingClientRect();

const isEmpty = ({ left, top, right, bottom }: Box): boolean => right <= left || bottom <= top;

const gapBetween = (a: Box, b: Box): number =>
  Math.max(0, a.left - b.right, b.left - a.right, a.top - b.bottom, b.top - a.bottom);

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

/** The events React derives entering and leaving from: a tooltip's trigger shows and hides it on these. */
const bubbles = (type: string): boolean => type.endsWith('over') || type.endsWith('out');

const isLeave = (type: string): boolean => type.endsWith('out') || type.endsWith('leave');

interface HeldLeave {
  type: string;
  target: Element;
}

export interface TooltipHold {
  /** Takes a boundary event of the page or of the layer's UI at a tooltip; whether it was held back from the page. */
  hold(event: MouseEvent, ignoreSelectors: readonly string[]): boolean;
  /** Ends the hold once the pointer, at `point`, has turned away, or the tooltip has gone. */
  track(point: Point): void;
  /** Ends the hold: the page learns of the pointer's going, to where it is now. */
  release(point?: Point): void;
  /** The element that shows the tooltip held, when known. */
  trigger(): Element | null;
}

/**
 * A tooltip goes as the pointer leaves its element, and takes no pointer input:
 * to be clicked, it has to be kept showing while the pointer crosses over to it.
 * The hold starts as the pointer goes out of an element through the side facing
 * the tooltip it shows, or onto a tooltip from elsewhere, and lasts while the
 * pointer keeps nearing the tooltip, is on it or on the layer's UI at it, or is
 * back on the element. Meanwhile the page is told nothing of the pointer: not
 * of leaving the element, nor of entering what is under the tooltip, which the
 * tooltip covers (EUI shows one tooltip at a time, so another trigger entered
 * would take the tooltip down). As the pointer turns away, the element learns
 * of the leave, to the element now under the pointer.
 */
export const createTooltipHold = (): TooltipHold => {
  let current: {
    /** The element the page knows the pointer to be on. */
    origin: Element;
    tooltip: Element;
    trigger: Element | null;
    held: HeldLeave[];
    /** Nearest the pointer has been to the tooltip. */
    closest: number;
    ignoreSelectors: readonly string[];
  } | null = null;
  let releasing = false;

  const keeps = (point: Point): boolean => {
    if (!current) {
      return false;
    }
    const { origin, tooltip } = current;
    if (!origin.isConnected || !tooltip.isConnected || !isVisible(tooltip)) {
      return false;
    }
    if (contains(boxOf(origin), point)) {
      return true;
    }
    const distance = distanceFrom(areaOf(tooltip), point);
    if (distance > current.closest + SLACK) {
      return false;
    }
    current.closest = Math.min(current.closest, distance);
    return true;
  };

  /** The page element under the point, unless the layer's UI is there. */
  const pageElementAt = ({ x, y }: Point, ignoreSelectors: readonly string[]): Element | null => {
    const [top] = document.elementsFromPoint(x, y);
    return top && !isIgnored(top, ignoreSelectors) ? top : null;
  };

  const release = (point?: Point) => {
    if (!current) {
      return;
    }
    const { held, ignoreSelectors } = current;
    current = null;
    const to = point ? pageElementAt(point, ignoreSelectors) : null;
    releasing = true;
    try {
      held.forEach(({ type, target }) => {
        if (target.isConnected) {
          target.dispatchEvent(
            new MouseEvent(type, { bubbles: bubbles(type), cancelable: true, relatedTarget: to })
          );
        }
      });
    } finally {
      releasing = false;
    }
  };

  return {
    hold(event, ignoreSelectors) {
      const { target, relatedTarget } = event;
      if (releasing || !(target instanceof Element)) {
        return false;
      }
      const point = { x: event.clientX, y: event.clientY };
      if (current && !keeps(point)) {
        release(point);
      }
      const atUi = isAtTooltip(target);
      if (!atUi && isIgnored(target, ignoreSelectors)) {
        return false;
      }
      if (!current) {
        if (atUi || !isLeave(event.type)) {
          return false;
        }
        const tooltip = tooltipShowing(target, ignoreSelectors);
        if (!tooltip) {
          return false;
        }
        const origin = promoteToCommentable(target);
        const [originBox, tooltipBox, area] = [boxOf(origin), boxOf(tooltip), areaOf(tooltip)];
        const towards =
          gapBetween(originBox, tooltipBox) <= MAX_GAP && facing(originBox, tooltipBox, point);
        const onto = isAtTooltip(relatedTarget) || distanceFrom(area, point) <= SLACK;
        if (!towards && !onto) {
          return false;
        }
        current = {
          origin,
          tooltip,
          trigger: triggerOf(tooltip) ?? (towards ? origin : null),
          held: [],
          closest: distanceFrom(area, point),
          ignoreSelectors,
        };
      }
      const { origin, held } = current;
      if (isLeave(event.type) && origin.contains(target)) {
        if (!held.some((leave) => leave.type === event.type && leave.target === target)) {
          held.push({ type: event.type, target });
        }
      } else if (!bubbles(event.type) && !atUi) {
        // Entering and leaving elsewhere on the page, as told to the elements themselves: not React's.
        return false;
      }
      event.stopPropagation();
      return true;
    },

    track(point) {
      if (current && !keeps(point)) {
        release(point);
      }
    },

    release,

    trigger: () => current?.trigger ?? null,
  };
};
