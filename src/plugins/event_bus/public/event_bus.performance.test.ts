/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { configureStore } from '@reduxjs/toolkit';
import type { Subscription } from 'rxjs';

import { mockTestSlice } from './__mocks__/event_bus_mocks';
import { EventBus } from './event_bus';

describe('EventBus', () => {
  let eventBus: EventBus<typeof mockTestSlice>;
  let mockSubscriber: jest.Mock;
  let subscription: Subscription;

  beforeEach(() => {
    eventBus = new EventBus(mockTestSlice);
    mockSubscriber = jest.fn();
    subscription = eventBus.subscribe(mockSubscriber);
  });

  afterEach(() => {
    subscription.unsubscribe();
    eventBus.dispose();
  });

  describe('performance', () => {
    it('should handle 1000 actions in reasonable time', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        eventBus.actions.increment();
      }

      const duration = performance.now() - start;

      // Set a generous upper bound to avoid CI failures.
      // 500ms is very generous, actual time is ~15ms but
      // this should let us track severe regressions.
      expect(duration).toBeLessThan(500);
    });

    it('should not be significantly slower than plain Redux', () => {
      const store = configureStore({ reducer: mockTestSlice.reducer });

      const reduxStart = performance.now();
      for (let i = 0; i < 1000; i++) {
        store.dispatch(mockTestSlice.actions.increment());
      }
      const reduxDuration = performance.now() - reduxStart;

      const eventBusStart = performance.now();
      for (let i = 0; i < 1000; i++) {
        eventBus.actions.increment();
      }
      const eventBusDuration = performance.now() - eventBusStart;

      // Assert event bus shouldn't be dramatically slower
      // 1.5x is a generous factor to account for CI variability
      // Local baseline is that both eventBus and plain Redux are ~15ms.
      expect(eventBusDuration).toBeLessThan(reduxDuration * 1.5);
    });
  });
});
