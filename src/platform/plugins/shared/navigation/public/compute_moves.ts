/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NavigationCustomizationMove } from '@kbn/core-chrome-browser';

/**
 * Diffs `userOrder` against `defaultOrder` and returns the minimal set of moves
 * needed to reproduce the user's arrangement by replaying them on the default.
 *
 * Walks `userOrder` left to right, maintaining a working copy of the list and
 * recording a move only when an item's current predecessor does not yet match
 * its desired predecessor in the target order.
 *
 * Both arrays should contain the same item IDs (though `userOrder` may contain
 * items not in `defaultOrder` if new items were added, and vice versa if items
 * were removed). Unknown IDs are passed through unchanged.
 */
export const computeMoves = (
  defaultOrder: readonly string[],
  userOrder: readonly string[]
): NavigationCustomizationMove[] => {
  const moves: NavigationCustomizationMove[] = [];
  const working = [...defaultOrder];

  const applyMove = (id: string, afterId: string | null) => {
    const fromIdx = working.indexOf(id);
    if (fromIdx === -1) {
      if (afterId === null) {
        working.unshift(id);
      } else {
        const afterIdx = working.indexOf(afterId);
        working.splice(afterIdx + 1, 0, id);
      }
      return;
    }

    working.splice(fromIdx, 1);
    if (afterId === null) {
      working.unshift(id);
    } else {
      const afterIdx = working.indexOf(afterId);
      working.splice(afterIdx + 1, 0, id);
    }
  };

  for (let i = 0; i < userOrder.length; i++) {
    const id = userOrder[i];
    const afterId = i === 0 ? null : userOrder[i - 1];

    const currentIdx = working.indexOf(id);
    const currentAfterId = currentIdx <= 0 ? null : working[currentIdx - 1];

    if (currentAfterId !== afterId) {
      moves.push({ id, afterId });
      applyMove(id, afterId);
    }
  }

  return moves;
};
