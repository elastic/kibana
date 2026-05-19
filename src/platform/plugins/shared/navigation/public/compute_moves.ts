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
 * Only items whose predecessor in `userOrder` differs from their predecessor in
 * `defaultOrder` produce a move entry — items left in their default relative
 * position are not recorded.
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

  for (let i = 0; i < userOrder.length; i++) {
    const id = userOrder[i];
    const afterId = i === 0 ? null : userOrder[i - 1];

    const defaultIdx = defaultOrder.indexOf(id);
    const defaultAfterId = defaultIdx <= 0 ? null : defaultOrder[defaultIdx - 1];

    if (afterId !== defaultAfterId) {
      moves.push({ id, afterId });
    }
  }

  return moves;
};
