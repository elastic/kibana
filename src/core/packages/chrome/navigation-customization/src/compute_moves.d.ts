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
 * The items that did *not* move are those forming the Longest Common Subsequence
 * of `defaultOrder` and `userOrder` — i.e. the longest backbone that already
 * appears in the same relative order in both lists. Because both lists are
 * permutations of (mostly) the same items, that LCS is equivalent to the Longest
 * Increasing Subsequence of each user item's position in the default order.
 *
 * Only the items outside that backbone are emitted as moves, each anchored after
 * its predecessor in `userOrder` (or to the front when it is first). Emitting in
 * user order guarantees every anchor is already in place when its move is replayed.
 * This yields `n - LCS` moves — the minimum — and preserves user intent (e.g.
 * dragging one item to the bottom records a single move for that item rather than
 * cascading moves across every item it passed).
 *
 * Both arrays should contain the same item IDs, though `userOrder` may contain
 * items not in `defaultOrder` (newly added items, always treated as moved) and
 * `defaultOrder` may contain items not in `userOrder` (removed/hidden items, left
 * untouched during replay).
 */
export declare const computeMoves: (
  defaultOrder: readonly string[],
  userOrder: readonly string[]
) => NavigationCustomizationMove[];
