/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { reorder } from '@atlaskit/pragmatic-drag-and-drop/reorder';

/**
 * The part of a measured `DOMRect` these calculations need. Narrowed from `DOMRect` so that the
 * maths can be exercised without a layout engine.
 */
export interface ControlRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

/**
 * How much two rects overlap, as a proportion of the area they jointly cover, or zero when they do
 * not overlap. Measuring the overlap against the combined area rather than in raw pixels stops a
 * wide slot from beating a narrow one purely by being bigger.
 */
const getOverlapRatio = (a: ControlRect, b: ControlRect): number => {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.left + a.width, b.left + b.width);
  const bottom = Math.min(a.top + a.height, b.top + b.height);

  if (left >= right || top >= bottom) return 0;

  const overlap = (right - left) * (bottom - top);
  return overlap / (a.width * a.height + b.width * b.height - overlap);
};

/**
 * Works out which slot the dragged control should take, by projecting the control from the pointer
 * and finding the slot it covers the most of.
 *
 * Measuring the control rather than the pointer matters: the drag handle is at the far left of a
 * control, so the pointer sits well to the left of the thing the user perceives themselves to be
 * moving. Hit-testing the pointer against slot boundaries would make them drag most of the way
 * across the *next* control before anything happened. Comparing the control against the slots
 * instead means it changes places once it has travelled about half a slot, which is how far it had
 * to move before this group was ported off dnd-kit.
 *
 * Overlap is the comparison rather than distance between centres because the group wraps and the
 * controls are not all the same width. A wide control alone on a second row has its centre close to
 * the centre of the first slot, even though it is a row below and several places away in the order,
 * so ranking by distance lets a small sideways nudge fling a control to the far end of the group.
 * Two rects on different rows do not overlap at all, so ranking by overlap cannot make that mistake.
 *
 * A control that covers no slot stays where it is, so dragging it out of the group and back does
 * not disturb the order on the way past.
 */
export const getDropDestinationIndex = ({
  rects,
  startIndex,
  grabOffset,
  pointer,
}: {
  rects: ControlRect[];
  startIndex: number;
  /** Where in the dragged control the pointer took hold of it */
  grabOffset: Point;
  pointer: Point;
}): number => {
  const source = rects[startIndex];
  if (!source) return startIndex;

  const dragged: ControlRect = {
    left: pointer.x - grabOffset.x,
    top: pointer.y - grabOffset.y,
    width: source.width,
    height: source.height,
  };

  let destinationIndex = startIndex;
  let largestOverlap = 0;

  rects.forEach((rect, index) => {
    const overlap = getOverlapRatio(dragged, rect);
    if (overlap > largestOverlap) {
      largestOverlap = overlap;
      destinationIndex = index;
    }
  });

  return destinationIndex;
};

/**
 * Works out the place each control should take for the group to look like the dragged control has
 * already landed at `destinationIndex`, as a CSS `order` per control in their current order.
 *
 * Reordering the group is left to flexbox rather than done with transforms. The controls are not
 * all the same width, several of them grow to share out whatever space is left on their row, and
 * the group wraps, so moving one control changes which controls share a row, and therefore changes
 * every width on both rows. Nothing short of a real layout pass can work that out, so the group
 * asks for the destination arrangement and lets the browser lay it out.
 */
export const getDisplayPositions = ({
  count,
  startIndex,
  destinationIndex,
}: {
  count: number;
  startIndex: number;
  destinationIndex: number;
}): number[] => {
  const controls = Array.from({ length: count }, (_, index) => index);
  const isInRange = (index: number) => index >= 0 && index < count;

  // A control added or removed mid-drag leaves the indices measured at drag start out of step with
  // the group, and rearranging on them would shuffle controls to arbitrary places
  if (!isInRange(startIndex) || !isInRange(destinationIndex)) return controls;

  const occupants = reorder({ list: controls, startIndex, finishIndex: destinationIndex });

  const positions = new Array<number>(count);
  occupants.forEach((controlIndex, position) => {
    positions[controlIndex] = position;
  });

  return positions;
};
