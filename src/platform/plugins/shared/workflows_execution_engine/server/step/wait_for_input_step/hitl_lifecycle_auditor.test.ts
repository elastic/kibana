/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  emitHitlLifecycle,
  type HitlLifecycleEvent,
  registerHitlLifecycleAuditor,
} from './hitl_lifecycle_auditor';

describe('hitl_lifecycle_auditor', () => {
  afterEach(() => {
    // Ensure no auditor leaks across tests.
    registerHitlLifecycleAuditor(() => undefined)();
  });

  it('registers an auditor and returns a disposer that clears only that registration', () => {
    const first = jest.fn();
    const second = jest.fn();
    const disposeFirst = registerHitlLifecycleAuditor(first);
    const disposeSecond = registerHitlLifecycleAuditor(second);

    const event: HitlLifecycleEvent = { type: 'canceled', executionId: 'e-1' };
    emitHitlLifecycle(event);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(event);

    disposeFirst();
    emitHitlLifecycle(event);
    expect(second).toHaveBeenCalledTimes(2);

    disposeSecond();
    emitHitlLifecycle(event);
    expect(second).toHaveBeenCalledTimes(2);
  });
});
