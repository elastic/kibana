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
import { getTourQueue } from '../state/registry';
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

  it('should return isActive as true for the active tour', () => {
    const { result } = renderHook(() => useTourQueue(TOUR_1));

    expect(result.current.isActive).toBe(true);
  });

  it('should return isActive as false for a waiting tour', () => {
    renderHook(() => useTourQueue(TOUR_1));
    const tour2Hook = renderHook(() => useTourQueue(TOUR_2));

    expect(tour2Hook.result.current.isActive).toBe(false);
  });

  it('should update isActive when the tour becomes active', () => {
    const tour1Hook = renderHook(() => useTourQueue(TOUR_1));
    const tour2Hook = renderHook(() => useTourQueue(TOUR_2));

    expect(tour2Hook.result.current.isActive).toBe(false);

    // Complete the first tour
    act(() => {
      tour1Hook.result.current.onComplete();
    });

    // Second tour should now be active
    expect(tour2Hook.result.current.isActive).toBe(true);
  });

  it('should update isActive to false when tour is completed', () => {
    const { result } = renderHook(() => useTourQueue(TOUR_1));

    expect(result.current.isActive).toBe(true);

    act(() => {
      result.current.onComplete();
    });

    expect(result.current.isActive).toBe(false);
  });

  it('should update isActive to false when queue is skipped', () => {
    const tour1Hook = renderHook(() => useTourQueue(TOUR_1));
    const tour2Hook = renderHook(() => useTourQueue(TOUR_2));
    const tourQueue = getTourQueue();

    // Initial state
    expect(tour1Hook.result.current.isActive).toBe(true);
    expect(tour2Hook.result.current.isActive).toBe(false);

    // Skip all tours
    act(() => {
      tourQueue.skipAll();
    });

    // All tours should be false
    expect(tour1Hook.result.current.isActive).toBe(false);
    expect(tour2Hook.result.current.isActive).toBe(false);
  });
});
