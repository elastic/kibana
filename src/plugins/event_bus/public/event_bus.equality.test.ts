/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSlice } from '@reduxjs/toolkit';
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
});
