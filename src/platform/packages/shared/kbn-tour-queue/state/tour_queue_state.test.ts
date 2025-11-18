/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TourQueueStateManager } from './tour_queue_state';
import type { TourId } from '..';

const TOUR_1 = 'tour1' as TourId;
const TOUR_2 = 'tour2' as TourId;

// Mock getTourPriority to return mocked TOUR_REGISTRY priorities
jest.mock('..', () => {
  const actual = jest.requireActual('..');
  return {
    ...actual,
    getTourPriority: jest.fn((tourId: TourId) => {
      const TOUR_REGISTRY = {
        [TOUR_1]: 1,
        [TOUR_2]: 2,
      } as const;
      return TOUR_REGISTRY[tourId as string];
    }),
  };
});

describe('TourQueueStateManager', () => {
  let manager: TourQueueStateManager;
  let subscriber: jest.Mock;

  beforeEach(() => {
    manager = new TourQueueStateManager();
    subscriber = jest.fn();
  });

  describe('registerTour', () => {
    it('should register tours with provided ids and in priority order', () => {
      manager.registerTour(TOUR_2); // priority 2
      manager.registerTour(TOUR_1); // priority 1

      const state = manager.getState();
      expect(state.registeredTourIds[0]).toBe(TOUR_1);
      expect(state.registeredTourIds[1]).toBe(TOUR_2);
    });

    it('should not register the same tour twice', () => {
      manager.registerTour(TOUR_1);
      manager.registerTour(TOUR_1);

      const state = manager.getState();
      expect(state.registeredTourIds.filter((id) => id === TOUR_1)).toHaveLength(1);
    });

    it('should notify subscribers when a tour is registered', () => {
      manager.subscribe(subscriber);

      manager.registerTour(TOUR_1);
      manager.registerTour(TOUR_2);

      expect(subscriber).toHaveBeenCalledTimes(2);
    });

    it('should notify subscribers when a tour is unregistered', () => {
      const tour = manager.registerTour(TOUR_1);
      manager.subscribe(subscriber);

      tour.complete();

      expect(subscriber).toHaveBeenCalledTimes(1);
    });
  });

  describe('getActiveTour', () => {
    it('should return the first in priority order registered tour', () => {
      manager.registerTour(TOUR_2);
      manager.registerTour(TOUR_1);

      expect(manager.getActiveTour()).toBe(TOUR_1);
    });

    it('should return the next tour after the first is completed', () => {
      manager.registerTour(TOUR_1);
      manager.registerTour(TOUR_2);

      manager.completeTour(TOUR_1);

      expect(manager.getActiveTour()).toBe(TOUR_2);
    });

    it('should return null when all tours are completed', () => {
      manager.registerTour(TOUR_1);
      manager.registerTour(TOUR_2);

      manager.completeTour(TOUR_1);
      manager.completeTour(TOUR_2);

      expect(manager.getActiveTour()).toBeNull();
    });

    it('should return null when queue is skipped', () => {
      manager.registerTour(TOUR_1);
      manager.skipAllTours();

      expect(manager.getActiveTour()).toBeNull();
    });
  });

  describe('shouldShowTour', () => {
    it('should return true for the active tour and false for a waiting tour', () => {
      manager.registerTour(TOUR_1);
      manager.registerTour(TOUR_2);

      expect(manager.shouldShowTour(TOUR_1)).toBe(true);
      expect(manager.shouldShowTour(TOUR_2)).toBe(false);
    });

    it('should return false for a completed tour', () => {
      manager.registerTour(TOUR_1);
      manager.completeTour(TOUR_1);

      expect(manager.shouldShowTour(TOUR_1)).toBe(false);
    });

    it('should return false when queue is skipped', () => {
      manager.registerTour(TOUR_1);
      manager.skipAllTours();

      expect(manager.shouldShowTour(TOUR_1)).toBe(false);
    });
  });

  describe('completeTour', () => {
    it('should mark a tour as completed', () => {
      manager.registerTour(TOUR_1);
      manager.registerTour(TOUR_2);
      manager.completeTour(TOUR_1);

      const state = manager.getState();
      expect(state.completedTourIds.size).toBe(1);
      expect(state.completedTourIds.has(TOUR_1)).toBe(true);
    });

    it('should notify subscribers', () => {
      manager.registerTour(TOUR_1);
      manager.subscribe(subscriber);

      manager.completeTour(TOUR_1);

      expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it('should allow the next tour to become active', () => {
      manager.registerTour(TOUR_1);
      manager.registerTour(TOUR_2);

      expect(manager.getActiveTour()).toBe(TOUR_1);

      manager.completeTour(TOUR_1);

      expect(manager.getActiveTour()).toBe(TOUR_2);
    });
  });

  describe('skipAllTours', () => {
    it('should set isQueueSkipped to true', () => {
      manager.registerTour(TOUR_1);
      manager.skipAllTours();

      expect(manager.getState().isQueueSkipped).toBe(true);
    });

    it('should notify subscribers', () => {
      manager.subscribe(subscriber);
      manager.skipAllTours();

      expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it('should prevent all tours from showing', () => {
      manager.registerTour(TOUR_1);
      manager.registerTour(TOUR_2);

      manager.skipAllTours();

      expect(manager.shouldShowTour(TOUR_1)).toBe(false);
      expect(manager.shouldShowTour(TOUR_2)).toBe(false);
    });
  });
});
