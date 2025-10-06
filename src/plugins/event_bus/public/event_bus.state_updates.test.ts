/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Subscription } from 'rxjs';

import { mockInitialState, mockTestSlice } from './__mocks__/event_bus_mocks';
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

  describe('initialization', () => {
    it('should initialize with the correct initial state', () => {
      // subscribing (via beforeEach) should trigger an initial state update
      expect(mockSubscriber).toHaveBeenCalledTimes(1);
      expect(mockSubscriber).toHaveBeenLastCalledWith(mockInitialState());
    });

    it('should wrap all slice actions', () => {
      expect(Object.keys(eventBus.actions)).toEqual(Object.keys(mockTestSlice.actions));
    });
  });

  describe('state updates', () => {
    it('should update state when actions are dispatched', () => {
      // Reset mock to clear initial call
      mockSubscriber.mockReset();

      eventBus.actions.increment();
      eventBus.actions.setText('test');

      expect(mockSubscriber).toHaveBeenCalledTimes(2);
      expect(mockSubscriber).toHaveBeenLastCalledWith({
        ...mockInitialState(),
        counter: 1,
        text: 'test',
      });
    });

    it('should handle complex state updates', () => {
      // Reset mock to clear initial call
      mockSubscriber.mockReset();

      eventBus.actions.addItem('item1');
      eventBus.actions.addItem('item2');
      eventBus.actions.toggleFlag();

      expect(mockSubscriber).toHaveBeenCalledTimes(3);
      expect(mockSubscriber).toHaveBeenLastCalledWith({
        ...mockInitialState(),
        flag: true,
        data: {
          items: ['item1', 'item2'],
        },
      });
    });

    it('should emit state in correct sequence', () => {
      // Reset mock to clear initial call
      mockSubscriber.mockReset();

      eventBus.actions.increment();
      eventBus.actions.setText('test');
      eventBus.actions.reset();

      expect(mockSubscriber).toHaveBeenCalledTimes(3);
      expect(mockSubscriber.mock.calls[0][0]).toEqual({ ...mockInitialState(), counter: 1 });
      expect(mockSubscriber.mock.calls[1][0]).toEqual({
        ...mockInitialState(),
        counter: 1,
        text: 'test',
      });
      expect(mockSubscriber.mock.calls[2][0]).toEqual(mockInitialState());
    });

    it('should reset state correctly', () => {
      // Reset mock to clear initial call
      mockSubscriber.mockReset();

      eventBus.actions.increment();
      eventBus.actions.setText('test');
      eventBus.actions.reset();

      expect(mockSubscriber).toHaveBeenCalledTimes(3);
      expect(mockSubscriber).toHaveBeenLastCalledWith(mockInitialState());
    });
  });
});
