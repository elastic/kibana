/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EventBus } from './event_bus';
import type { Subscription } from 'rxjs';

// Mock interface and initial state for testing
interface TestState {
  counter: number;
  text: string;
  flag: boolean;
  data: {
    items: string[];
  };
}

const initialState: () => TestState = () => ({
  counter: 0,
  text: '',
  flag: false,
  data: {
    items: [],
  },
});

// Create a test slice
const testSlice = createSlice({
  name: 'test',
  initialState: initialState(),
  reducers: {
    increment: (state) => {
      state.counter += 1;
    },
    setText: (state, action: PayloadAction<string>) => {
      state.text = action.payload;
    },
    toggleFlag: (state) => {
      state.flag = !state.flag;
    },
    addItem: (state, action: PayloadAction<string>) => {
      state.data.items.push(action.payload);
    },
    reset: () => initialState(),
  },
});

describe('EventBus', () => {
  let eventBus: EventBus<typeof testSlice>;
  let mockSubscriber: jest.Mock;
  let subscription: Subscription;

  beforeEach(() => {
    eventBus = new EventBus(testSlice);
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
      expect(mockSubscriber).toHaveBeenLastCalledWith(initialState());
    });

    it('should wrap all slice actions', () => {
      expect(Object.keys(eventBus.actions)).toEqual(Object.keys(testSlice.actions));
    });
  });

  describe('state updates', () => {
    it('should update state when actions are dispatched', () => {
      // Reset mock to clear initial call
      mockSubscriber.mockReset();

      eventBus.actions.increment();
      eventBus.actions.setText('test');

      expect(mockSubscriber).toHaveBeenCalledTimes(2); // 2 actions
      expect(mockSubscriber).toHaveBeenLastCalledWith({
        ...initialState(),
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

      expect(mockSubscriber).toHaveBeenCalledTimes(3); // 3 actions
      expect(mockSubscriber).toHaveBeenLastCalledWith({
        ...initialState(),
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

      expect(mockSubscriber).toHaveBeenCalledTimes(3); // 3 actions
      expect(mockSubscriber.mock.calls[0][0]).toEqual({ ...initialState(), counter: 1 });
      expect(mockSubscriber.mock.calls[1][0]).toEqual({
        ...initialState(),
        counter: 1,
        text: 'test',
      });
      expect(mockSubscriber.mock.calls[2][0]).toEqual(initialState());
    });

    it('should reset state correctly', () => {
      // Reset mock to clear initial call
      mockSubscriber.mockReset();

      eventBus.actions.increment();
      eventBus.actions.setText('test');
      eventBus.actions.reset();

      expect(mockSubscriber).toHaveBeenCalledTimes(3); // 3 actions
      expect(mockSubscriber).toHaveBeenLastCalledWith(initialState());
    });
  });

  describe('selectors', () => {
    let selectorSubscription: Subscription;

    afterEach(() => {
      if (selectorSubscription) {
        selectorSubscription.unsubscribe();
      }
    });

    it('should work with selectors', () => {
      const counterSelector = (state: TestState) => state.counter;
      const mockCounterSubscriber = jest.fn();

      selectorSubscription = eventBus.subscribe(mockCounterSubscriber, counterSelector);

      eventBus.actions.increment();

      expect(mockCounterSubscriber).toHaveBeenCalledTimes(2); // Initial + increment
      expect(mockCounterSubscriber.mock.calls[0][0]).toBe(0);
      expect(mockCounterSubscriber.mock.calls[1][0]).toBe(1);
    });

    it("should not emit when selected value hasn't changed", () => {
      const textSelector = (state: TestState) => state.text;
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
      const itemsSelectors = (state: TestState) => state.data.items;
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

  describe('custom equality checks', () => {
    it('should handle NaN values correctly', () => {
      const nanSlice = createSlice({
        name: 'nan',
        initialState: { value: 0 },
        reducers: {
          setNaN: (state) => {
            state.value = NaN;
          },
        },
      });

      const nanEventBus = new EventBus(nanSlice);
      const mockNaNSubscriber = jest.fn();

      const nanSubscription = nanEventBus.subscribe(mockNaNSubscriber);

      // this should cause a state update
      nanEventBus.actions.setNaN();
      // this should not cause an update since the state is the same
      nanEventBus.actions.setNaN();

      expect(mockNaNSubscriber).toHaveBeenCalledTimes(2); // Initial + 1 NaN action
      expect(mockNaNSubscriber.mock.calls[0][0].value).toBe(0);
      expect(Number.isNaN(mockNaNSubscriber.mock.calls[1][0].value)).toBe(true);

      nanSubscription.unsubscribe();
      nanEventBus.dispose();
    });
  });

  describe('cleanup', () => {
    it('should clean up subscriptions on dispose', () => {
      // Create a new event bus for this test since we'll be disposing it
      const testEventBus = new EventBus(testSlice);
      const cleanupMockSubscriber = jest.fn();

      testEventBus.subscribe(cleanupMockSubscriber);

      // Reset mock to clear initial call
      cleanupMockSubscriber.mockReset();

      testEventBus.dispose();
      testEventBus.actions.increment();

      expect(cleanupMockSubscriber).not.toHaveBeenCalled();
    });

    it('should complete the subject on dispose', (done) => {
      // Create a new event bus for this test since we'll be disposing it
      const testEventBus = new EventBus(testSlice);

      testEventBus.subject.subscribe({
        complete: () => {
          done();
        },
      });

      testEventBus.dispose();
    });
  });

  describe('error handling', () => {
    it('should propagate errors from reducers through subscription', (done) => {
      const testError = new Error('Subscription error test');
      const errorSlice = createSlice({
        name: 'error',
        initialState: { value: 0 },
        reducers: {
          throwError: () => {
            throw testError;
          },
        },
      });

      const errorEventBus = new EventBus(errorSlice);
      const mockCallback = jest.fn();
      const mockSelector = jest.fn();
      const mockErrorHandler = jest.fn();

      // Subscribe with an error handler
      const errorSubscription = errorEventBus.subscribe(
        mockCallback,
        mockSelector,
        mockErrorHandler
      );

      try {
        errorEventBus.actions.throwError();
      } catch (e) {
        // In the real implementation, errors in reducers should be caught
        // and propagated through the observable error channel
        // If this catch block executes, the test should fail because
        // the error wasn't properly propagated
        errorSubscription.unsubscribe();
        errorEventBus.dispose();
        done.fail('Error was thrown instead of being propagated through the observable');
      }

      expect(mockErrorHandler).toHaveBeenCalledWith(testError);
      done();
    });

    it('should have error handling support in subscribe method', () => {
      // This test verifies that the subscribe method accepts error handlers
      const mockErrorHandler = jest.fn();

      // Create a modified EventBus implementation that tests error handling
      class TestErrorEventBus extends EventBus<typeof testSlice> {
        triggerError(error: Error) {
          this.subject.error(error);
        }
      }

      const errorBus = new TestErrorEventBus(testSlice);

      const errorSubscription = errorBus.subscribe(
        () => {}, // next handler
        undefined, // no selector
        mockErrorHandler // error handler
      );

      const testError = new Error('Subscription error test');
      errorBus.triggerError(testError);

      expect(mockErrorHandler).toHaveBeenCalledWith(testError);

      errorSubscription.unsubscribe();
      errorBus.dispose();
    });
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
