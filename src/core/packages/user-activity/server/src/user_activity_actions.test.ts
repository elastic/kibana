/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { removedUserActivityActions, userActivityActions } from './user_activity_actions';

// These counts are intentional guards to keep the registries tidy.
// If you remove an action id, move it to `removedUserActivityActions` (don't delete it),
// then update these numbers.
const EXPECTED_TOTAL_COUNT = 3; // active + removed
const EXPECTED_REMOVED_COUNT = 2; // removed only

describe('userActivityActions registry', () => {
  it('keeps the total number of action ids stable', () => {
    const activeCount = Object.keys(userActivityActions).length;
    const removedCount = Object.keys(removedUserActivityActions).length;

    expect(activeCount + removedCount).toBe(EXPECTED_TOTAL_COUNT);
  });

  it('keeps removed action ids listed', () => {
    expect(Object.keys(removedUserActivityActions)).toHaveLength(EXPECTED_REMOVED_COUNT);
  });

  it('does not allow overlapping action ids', () => {
    const activeIds = new Set(Object.keys(userActivityActions));
    const overlaps = Object.keys(removedUserActivityActions).filter((id) => activeIds.has(id));

    expect(overlaps).toHaveLength(0);
  });
});
