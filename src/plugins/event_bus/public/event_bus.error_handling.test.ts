/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSlice } from '@reduxjs/toolkit';

import { mockTestSlice } from './__mocks__/event_bus_mocks';
import { EventBus } from './event_bus';

describe('EventBus', () => {
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
      class TestErrorEventBus extends EventBus<typeof mockTestSlice> {
        triggerError(error: Error) {
          this.subject.error(error);
        }
      }

      const errorBus = new TestErrorEventBus(mockTestSlice);

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
});
