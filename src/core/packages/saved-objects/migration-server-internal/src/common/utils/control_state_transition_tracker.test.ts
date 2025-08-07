/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlStateTransitionDiag } from './control_state_transition_tracker';

describe('ControlStateTransitionTracker', () => {
  let tracker: ControlStateTransitionDiag;
  beforeEach(() => {
    tracker = ControlStateTransitionDiag.create();
  });
  it('should observe transitions and update length', () => {
    expect(tracker.length).toBe(0);

    tracker.observeTransition('A', 'B', 10);
    expect(tracker.length).toBe(1);

    tracker.observeTransition('B', 'C', 20);
    expect(tracker.length).toBe(2);
  });

  it('should format 1 transitions with pretty()', () => {
    tracker.observeTransition('Init', 'Running', 5);

    expect(tracker.prettyPrint()).toBe(`[
  Init -> Running (5ms)
]`);
  });

  it('should format >1 transitions with pretty()', () => {
    tracker.observeTransition('Init', 'Running', 5);
    tracker.observeTransition('Running', 'Done', 15);

    expect(tracker.prettyPrint()).toBe(`[
  Init -> Running (5ms)
  Running -> Done (15ms)
]`);
  });

  it('should handle pretty() with no transitions', () => {
    expect(tracker.prettyPrint()).toBe('[<No transitions observed>]');
  });
});
