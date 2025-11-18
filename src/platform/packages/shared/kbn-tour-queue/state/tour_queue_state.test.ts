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
  let tourQueue: TourQueueStateManager;
  let subscriber: jest.Mock;

  beforeEach(() => {
    tourQueue = new TourQueueStateManager();
    subscriber = jest.fn();
  });

  describe('register', () => {
    it('should register tours with provided ids and in priority order', () => {
      tourQueue.register(TOUR_2); // priority 2
      tourQueue.register(TOUR_1); // priority 1

      const state = tourQueue.getState();
      expect(state.registeredTourIds[0]).toBe(TOUR_1);
      expect(state.registeredTourIds[1]).toBe(TOUR_2);
    });

    it('should not register the same tour twice', () => {
      tourQueue.register(TOUR_1);
      tourQueue.register(TOUR_1);

      const state = tourQueue.getState();
      expect(state.registeredTourIds.filter((id) => id === TOUR_1)).toHaveLength(1);
    });

    it('should notify subscribers when a tour is registered', () => {
      tourQueue.subscribe(subscriber);

      tourQueue.register(TOUR_1);
      tourQueue.register(TOUR_2);

      expect(subscriber).toHaveBeenCalledTimes(2);
    });

    it('should notify subscribers when a tour is unregistered', () => {
      const tour = tourQueue.register(TOUR_1);
      tourQueue.subscribe(subscriber);

      tour.complete();

      expect(subscriber).toHaveBeenCalledTimes(1);
    });
  });

  describe('getActive', () => {
    it('should return the first in priority order registered tour', () => {
      tourQueue.register(TOUR_2);
      tourQueue.register(TOUR_1);

      expect(tourQueue.getActive()).toBe(TOUR_1);
    });

    it('should return the next tour after the first is completed', () => {
      tourQueue.register(TOUR_1);
      tourQueue.register(TOUR_2);

      tourQueue.complete(TOUR_1);

      expect(tourQueue.getActive()).toBe(TOUR_2);
    });

    it('should return null when all tours are completed', () => {
      tourQueue.register(TOUR_1);
      tourQueue.register(TOUR_2);

      tourQueue.complete(TOUR_1);
      tourQueue.complete(TOUR_2);

      expect(tourQueue.getActive()).toBeNull();
    });

    it('should return null when queue is skipped', () => {
      tourQueue.register(TOUR_1);
      tourQueue.skipAll();

      expect(tourQueue.getActive()).toBeNull();
    });
  });

  describe('isActive', () => {
    it('should return true for the active tour and false for a waiting tour', () => {
      tourQueue.register(TOUR_1);
      tourQueue.register(TOUR_2);

      expect(tourQueue.isActive(TOUR_1)).toBe(true);
      expect(tourQueue.isActive(TOUR_2)).toBe(false);
    });

    it('should return false for a completed tour', () => {
      tourQueue.register(TOUR_1);
      tourQueue.complete(TOUR_1);

      expect(tourQueue.isActive(TOUR_1)).toBe(false);
    });

    it('should return false when queue is skipped', () => {
      tourQueue.register(TOUR_1);
      tourQueue.skipAll();

      expect(tourQueue.isActive(TOUR_1)).toBe(false);
    });
  });

  describe('complete', () => {
    it('should mark a tour as completed', () => {
      tourQueue.register(TOUR_1);
      tourQueue.register(TOUR_2);
      tourQueue.complete(TOUR_1);

      const state = tourQueue.getState();
      expect(state.completedTourIds.size).toBe(1);
      expect(state.completedTourIds.has(TOUR_1)).toBe(true);
    });

    it('should notify subscribers', () => {
      tourQueue.register(TOUR_1);
      tourQueue.subscribe(subscriber);

      tourQueue.complete(TOUR_1);

      expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it('should allow the next tour to become active', () => {
      tourQueue.register(TOUR_1);
      tourQueue.register(TOUR_2);

      expect(tourQueue.getActive()).toBe(TOUR_1);

      tourQueue.complete(TOUR_1);

      expect(tourQueue.getActive()).toBe(TOUR_2);
    });
  });

  describe('skipAll', () => {
    it('should set isQueueSkipped to true', () => {
      tourQueue.register(TOUR_1);
      tourQueue.skipAll();

      expect(tourQueue.getState().isQueueSkipped).toBe(true);
    });

    it('should notify subscribers', () => {
      tourQueue.subscribe(subscriber);
      tourQueue.skipAll();

      expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it('should prevent all tours from showing', () => {
      tourQueue.register(TOUR_1);
      tourQueue.register(TOUR_2);

      tourQueue.skipAll();

      expect(tourQueue.isActive(TOUR_1)).toBe(false);
      expect(tourQueue.isActive(TOUR_2)).toBe(false);
    });
  });
});
