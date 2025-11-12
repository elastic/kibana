/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useState } from 'react';
import { getTourQueueStateManager } from '../state/registry';
import type { TourId } from '..';

export interface TourQueueResult {
  shouldShow: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

/**
 * Hook to manage tour queue state
 * */
export const useTourQueue = (tourId: TourId): TourQueueResult => {
  const tourQueueStateManager = getTourQueueStateManager();
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Register and get cleanup function
    const removeTour = tourQueueStateManager.registerTour(tourId);
    // Set initial shouldShow state
    setShouldShow(tourQueueStateManager.shouldShowTour(tourId));
    // Subscribe to state changes and get cleanup function
    const stopListening = tourQueueStateManager.subscribe(() => {
      setShouldShow(tourQueueStateManager.shouldShowTour(tourId));
    });
    return () => {
      removeTour();
      stopListening();
    };
  }, [tourId, tourQueueStateManager]);

  const onComplete = useCallback(() => {
    tourQueueStateManager.completeTour(tourId);
  }, [tourId, tourQueueStateManager]);

  const onSkip = useCallback(async () => {
    await tourQueueStateManager.skipAllTours();
  }, [tourQueueStateManager]);

  return {
    shouldShow,
    onComplete,
    onSkip,
  };
};
