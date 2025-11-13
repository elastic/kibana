/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { useTourQueue } from './use_tour_queue';
import { getTourQueueStateManager } from '../state/registry';
import type { TourId } from '..';

describe('useTourQueue', () => {
  const REGISTRY_KEY = '__KIBANA_TOUR_QUEUE_CTX__';

  const TOUR_1 = 'tour1' as TourId;
  const TOUR_2 = 'tour2' as TourId;

  beforeEach(() => {
    // Clean up the global registry before each test
    if (typeof globalThis !== 'undefined') {
      delete (globalThis as any)[REGISTRY_KEY];
    }
  });

  it('should return shouldShow as true for the active tour', () => {
    const { result } = renderHook(() => useTourQueue(TOUR_1));

    expect(result.current.shouldShow).toBe(true);
  });

  it('should return shouldShow as false for a waiting tour', () => {
    const tour1Hook = renderHook(() => useTourQueue(TOUR_1));
    const tour2Hook = renderHook(() => useTourQueue(TOUR_2));

    expect(tour2Hook.result.current.shouldShow).toBe(false);
  });

  it('should update shouldShow when the tour becomes active', () => {
    const tour1Hook = renderHook(() => useTourQueue(TOUR_1));
    const tour2Hook = renderHook(() => useTourQueue(TOUR_2));

    expect(tour2Hook.result.current.shouldShow).toBe(false);

    // Complete the first tour
    act(() => {
      tour1Hook.result.current.onComplete();
    });

    // Second tour should now be active
    expect(tour2Hook.result.current.shouldShow).toBe(true);
  });

  it('should update shouldShow to false when tour is completed', () => {
    const { result } = renderHook(() => useTourQueue(TOUR_1));

    expect(result.current.shouldShow).toBe(true);

    act(() => {
      result.current.onComplete();
    });

    expect(result.current.shouldShow).toBe(false);
  });

  it('should update shouldShow to false when queue is skipped', () => {
    const tour1Hook = renderHook(() => useTourQueue(TOUR_1));
    const tour2Hook = renderHook(() => useTourQueue(TOUR_2));
    const manager = getTourQueueStateManager();

    // Initial state
    expect(tour1Hook.result.current.shouldShow).toBe(true);
    expect(tour2Hook.result.current.shouldShow).toBe(false);

    // Skip all tours
    act(() => {
      manager.skipAllTours();
    });

    // All tours should be false
    expect(tour1Hook.result.current.shouldShow).toBe(false);
    expect(tour2Hook.result.current.shouldShow).toBe(false);
  });
});
