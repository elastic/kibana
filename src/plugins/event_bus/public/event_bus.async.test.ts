/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
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

  describe('async thunks', () => {
    it('should handle async thunks', async () => {
      jest.useFakeTimers();

      // Create an async action that updates the state after a delay
      const asyncAction = createAsyncThunk('test/asyncAction', async (_, thunkApi) => {
        setTimeout(() => {
          thunkApi.dispatch(asyncSlice.actions.setData('the-async-data'));
        }, 100);
      });

      // State initializer
      const getInitialState: () => { data: null | string; isLoading: boolean } = () => ({
        data: null,
        isLoading: false,
      });

      // Create a slice with an async action
      const asyncSlice = createSlice({
        name: 'async',
        initialState: getInitialState(),
        reducers: {
          setData: (state, action: PayloadAction<string>) => {
            state.data = action.payload;
          },
        },
        extraReducers: (builder) => {
          builder.addCase(asyncAction.pending, (state) => {
            state.isLoading = true;
          });
          builder.addCase(asyncAction.fulfilled, (state) => {
            state.isLoading = false;
          });
        },
      });

      // Create an event bus for the async slice
      const asyncEventBus = new EventBus(asyncSlice);

      // Subscribe to the async event bus
      const asyncMockSubscriber = jest.fn();
      const asyncSubscription = asyncEventBus.subscribe(asyncMockSubscriber);

      // Initial state should be emitted
      expect(asyncMockSubscriber).toHaveBeenCalledTimes(1);
      expect(asyncMockSubscriber).toHaveBeenLastCalledWith(getInitialState());

      // Dispatch the async action
      const resp = asyncEventBus.dispatch(asyncAction());

      // The state should update to show that the async action is loading
      expect(asyncMockSubscriber).toHaveBeenCalledTimes(2);
      expect(asyncMockSubscriber).toHaveBeenLastCalledWith({
        ...getInitialState(),
        isLoading: true,
      });

      // Fast-forward time to allow the async action to complete
      jest.advanceTimersByTime(500);

      // IMPORTANT: We need to await the thunk's promise to catch the fulfilled state
      await resp;

      // The state should update to show that the async action has completed
      expect(asyncMockSubscriber).toHaveBeenCalledTimes(4);
      expect(asyncMockSubscriber).toHaveBeenLastCalledWith({
        ...getInitialState(),
        data: 'the-async-data',
        isLoading: false,
      });

      // cleanup
      asyncSubscription.unsubscribe();
      asyncEventBus.dispose();
      jest.useRealTimers();
    });
  });
});
