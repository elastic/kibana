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
  let cstDiag: ControlStateTransitionDiag;
  beforeEach(() => {
    cstDiag = ControlStateTransitionDiag.create();
  });
  it('should observe transitions and update length', () => {
    expect(cstDiag.length).toBe(0);

    cstDiag.observeTransition('A', 'B', 10);
    expect(cstDiag.length).toBe(1);

    cstDiag.observeTransition('B', 'C', 20);
    expect(cstDiag.length).toBe(2);
  });

  it('should format 1 transitions with pretty()', () => {
    cstDiag.observeTransition('Init', 'Running', 5);

    expect(cstDiag.prettyPrint()).toBe(`[
  Init -> Running (5ms)
]`);
  });

  it('should format >1 transitions with pretty()', () => {
    cstDiag.observeTransition('Init', 'Running', 5);
    cstDiag.observeTransition('Running', 'Done', 15);

    expect(cstDiag.prettyPrint()).toBe(`[
  Init -> Running (5ms)
  Running -> Done (15ms)
]`);
  });

  it('should handle pretty() with no transitions', () => {
    expect(cstDiag.prettyPrint()).toBe('[<No transitions observed>]');
  });
});
