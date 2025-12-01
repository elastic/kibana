/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getTourQueue } from '../state/registry';
import type { TourId } from '..';
import type { Tour } from '../state/tour_queue_state';

/**
 * Result object returned by useTourQueue
 * @public
 */
export interface TourQueueResult {
  /** Whether this tour is currently active and should be shown */
  isActive: boolean;
  /** Callback to mark this tour as completed */
  onComplete: () => void;
}

/**
 * Hook to manage tour queue state for a specific tour.
 * Automatically registers the tour, subscribes to queue changes,
 * and handles cleanup on unmount.
 *
 * @param tourId - The ID of the tour. Must be a valid ID from {@link TOURS}
 * @returns Object containing isActive state and onComplete callback
 * @public
 */
export const useTourQueue = (tourId: TourId): TourQueueResult => {
  const tourQueue = getTourQueue();
  const [isActive, setIsActive] = useState(false);
  const tourRef = useRef<Tour | null>(null);

  useEffect(() => {
    // Register and get tour object
    const tour = tourQueue.register(tourId);
    tourRef.current = tour;
    // Set initial isActive state
    setIsActive(tour.isActive());
    // Subscribe to state changes and get cleanup function
    const stopListening = tourQueue.subscribe(() => {
      setIsActive(tour.isActive());
    });
    return () => {
      tourRef.current?.unregister();
      stopListening();
    };
  }, [tourId, tourQueue]);

  const onComplete = useCallback(() => {
    tourRef.current?.complete();
  }, []);

  return {
    isActive,
    onComplete,
  };
};
