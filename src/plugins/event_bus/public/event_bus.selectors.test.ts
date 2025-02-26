/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Subscription } from 'rxjs';

import { type MockTestState, mockTestSlice } from './__mocks__/event_bus_mocks';
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

  describe('selectors', () => {
    let selectorSubscription: Subscription;

    afterEach(() => {
      if (selectorSubscription) {
        selectorSubscription.unsubscribe();
      }
    });

    it('should work with selectors', () => {
      const counterSelector = (state: MockTestState) => state.counter;
      const mockCounterSubscriber = jest.fn();

      selectorSubscription = eventBus.subscribe(mockCounterSubscriber, counterSelector);

      eventBus.actions.increment();

      expect(mockCounterSubscriber).toHaveBeenCalledTimes(2); // Initial + increment
      expect(mockCounterSubscriber.mock.calls[0][0]).toBe(0);
      expect(mockCounterSubscriber.mock.calls[1][0]).toBe(1);
    });

    it("should not emit when selected value hasn't changed", () => {
      const textSelector = (state: MockTestState) => state.text;
      const mockTextSubscriber = jest.fn();

      selectorSubscription = eventBus.subscribe(mockTextSubscriber, textSelector);

      eventBus.actions.setText('test');
      eventBus.actions.setText('test'); // Same value
      eventBus.actions.increment(); // Different property

      expect(mockTextSubscriber).toHaveBeenCalledTimes(2); // Initial + first setText
      expect(mockTextSubscriber.mock.calls[0][0]).toBe('');
      expect(mockTextSubscriber.mock.calls[1][0]).toBe('test');
    });

    it('should handle multiple actions correctly', () => {
      const itemsSelectors = (state: MockTestState) => state.data.items;
      const mockItemsSubscriber = jest.fn();

      eventBus.subscribe(mockItemsSubscriber, itemsSelectors);

      expect(mockItemsSubscriber).toHaveBeenCalledTimes(1);
      expect(mockItemsSubscriber).toHaveBeenLastCalledWith([]);

      eventBus.actions.addItem('a');
      eventBus.actions.addItem('b');

      expect(mockItemsSubscriber).toHaveBeenCalledTimes(3);
      expect(mockItemsSubscriber).toHaveBeenLastCalledWith(['a', 'b']);
    });
  });
});
