/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

  describe('subscription management', () => {
    it('should handle multiple subscriptions correctly', () => {
      // We already have one subscription set up in beforeEach
      const mockSubscriber2 = jest.fn();

      const subscription2 = eventBus.subscribe(mockSubscriber2);

      // Reset the mocks to clear initial calls
      mockSubscriber.mockReset();
      mockSubscriber2.mockReset();

      eventBus.actions.increment();

      expect(mockSubscriber).toHaveBeenCalledTimes(1); // increment
      expect(mockSubscriber2).toHaveBeenCalledTimes(1); // increment

      // Unsubscribe second subscription
      subscription2.unsubscribe();

      eventBus.actions.setText('test');

      // First subscriber continues to receive updates
      expect(mockSubscriber).toHaveBeenCalledTimes(2);
      // Second subscriber should not be called anymore
      expect(mockSubscriber2).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe properly', () => {
      // Create a new subscription for this test
      const testMockSubscriber = jest.fn();
      const testSubscription = eventBus.subscribe(testMockSubscriber);

      // Reset mock to clear initial call
      testMockSubscriber.mockReset();

      testSubscription.unsubscribe();

      eventBus.actions.increment();

      expect(testMockSubscriber).not.toHaveBeenCalled();

      // Our main subscription from beforeEach should still work
      expect(mockSubscriber).toHaveBeenCalled();
    });
  });
});
