/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { getReorderDestinationIndex } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index';
import { reorder } from '@atlaskit/pragmatic-drag-and-drop/reorder';
import type { PinnedControlLayoutState } from '@kbn/controls-schemas';

import type { ControlsLayout } from '../types';

type Controls = ControlsLayout['controls'];
type OrderedControl = PinnedControlLayoutState & { id: string };

/** The control group is laid out horizontally, so the indicator only ever sits on a side edge. */
export type DropIndicatorEdge = Extract<Edge, 'left' | 'right'>;

export interface DropIndicatorPosition {
  /** Index, within the current order, of the control the indicator is rendered against. */
  index: number;
  edge: DropIndicatorEdge;
}

interface DropParams {
  controls: Controls;
  sourceId: string;
  targetId: string;
  closestEdge: Edge | null;
}

const toOrderedArray = (controls: Controls): OrderedControl[] =>
  Object.entries(controls)
    .map(([id, control]) => ({ ...control, id }))
    .sort((a, b) => a.order - b.order);

const toControls = (ordered: OrderedControl[]): Controls =>
  ordered.reduce<Controls>((acc, { id, ...control }, order) => {
    acc[id] = { ...control, order };
    return acc;
  }, {});

/**
 * Resolves the control being hovered and the closest edge of it (as reported by Pragmatic
 * drag-and-drop's `closest-edge` hitbox) into the index the dragged control will occupy once
 * dropped. The control group is laid out horizontally, so the `horizontal` axis is used.
 *
 * Several hover positions describe the same slot — the right edge of one control and the left
 * edge of the next are the same gap, and the edges either side of the dragged control are no-ops
 * — so both the drop indicator and the reorder are derived from this to keep what the user sees
 * during the drag in step with where the control actually lands.
 *
 * Returns `null` when dropping would leave the order unchanged.
 */
const resolveDestination = ({ controls, sourceId, targetId, closestEdge }: DropParams) => {
  const ordered = toOrderedArray(controls);
  const startIndex = ordered.findIndex(({ id }) => id === sourceId);
  const indexOfTarget = ordered.findIndex(({ id }) => id === targetId);

  if (startIndex === -1 || indexOfTarget === -1) return null;

  const destinationIndex = getReorderDestinationIndex({
    startIndex,
    indexOfTarget,
    closestEdgeOfTarget: closestEdge,
    axis: 'horizontal',
  });

  if (destinationIndex === startIndex) return null;

  return { ordered, startIndex, destinationIndex };
};

/**
 * Returns the control to render the drop indicator against, and which of its edges, for the drop
 * currently being previewed. Returns `null` when the drop would not move the control, so that no
 * indicator promises a move that will not happen.
 */
export const getDropIndicatorPosition = (params: DropParams): DropIndicatorPosition | null => {
  const destination = resolveDestination(params);
  if (!destination) return null;

  const { startIndex, destinationIndex } = destination;

  // Moving forwards lands the control immediately after whatever currently sits at the
  // destination; moving backwards lands it immediately before.
  return {
    index: destinationIndex,
    edge: destinationIndex > startIndex ? 'right' : 'left',
  };
};

/**
 * Reorders the controls for the drop described by `params`.
 *
 * Returns the updated controls with recalculated `order`, or `null` when the drop is a no-op.
 */
export const reorderControlsByEdge = (params: DropParams): Controls | null => {
  const destination = resolveDestination(params);
  if (!destination) return null;

  const { ordered, startIndex, destinationIndex } = destination;

  return toControls(reorder({ list: ordered, startIndex, finishIndex: destinationIndex }));
};

/**
 * Moves a single control one step towards the start (`offset` < 0) or end (`offset` > 0) of the
 * group. Used for keyboard-driven reordering. Returns the updated controls along with the new
 * position for screen-reader announcements, or `null` when the control cannot move any further.
 */
export const moveControlByStep = ({
  controls,
  id,
  offset,
}: {
  controls: Controls;
  id: string;
  offset: number;
}): { controls: Controls; position: number; total: number } | null => {
  const ordered = toOrderedArray(controls);
  const currentIndex = ordered.findIndex((control) => control.id === id);

  if (currentIndex === -1) return null;

  const nextIndex = Math.max(0, Math.min(ordered.length - 1, currentIndex + offset));
  if (nextIndex === currentIndex) return null;

  const reordered = [...ordered];
  const [moved] = reordered.splice(currentIndex, 1);
  reordered.splice(nextIndex, 0, moved);

  return { controls: toControls(reordered), position: nextIndex, total: ordered.length };
};
