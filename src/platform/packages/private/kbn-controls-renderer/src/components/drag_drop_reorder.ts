/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { reorder } from '@atlaskit/pragmatic-drag-and-drop/reorder';
import type { PinnedControlLayoutState } from '@kbn/controls-schemas';

import type { ControlsLayout } from '../types';

type Controls = ControlsLayout['controls'];
type OrderedControl = PinnedControlLayoutState & { id: string };

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
 * Moves `sourceId` to `destinationIndex`, the slot the group has been reflowing around for the
 * duration of the drag.
 *
 * Returns the updated controls with recalculated `order`, or `null` when the drop is a no-op.
 */
export const reorderControlsToIndex = ({
  controls,
  sourceId,
  destinationIndex,
}: {
  controls: Controls;
  sourceId: string;
  destinationIndex: number;
}): Controls | null => {
  const ordered = toOrderedArray(controls);
  const startIndex = ordered.findIndex(({ id }) => id === sourceId);

  if (startIndex === -1) return null;
  if (destinationIndex < 0 || destinationIndex >= ordered.length) return null;
  if (destinationIndex === startIndex) return null;

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
