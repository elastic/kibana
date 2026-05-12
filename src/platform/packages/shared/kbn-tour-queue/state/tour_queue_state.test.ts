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

// Mock getOrder to return mocked TOUR_REGISTRY orders
jest.mock('..', () => {
  const actual = jest.requireActual('..');
  return {
    ...actual,
    getOrder: jest.fn((tourId: TourId) => {
      const TOUR_REGISTRY: Record<string, number> = {
        tour1: 1,
        tour2: 2,
      };
      return TOUR_REGISTRY[tourId];
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
    it('should register tours with provided ids and in order', () => {
      tourQueue.register(TOUR_2); // order 2
      tourQueue.register(TOUR_1); // order 1

      const state = tourQueue.getState();
      expect(state.registeredTourIds[0]).toBe(TOUR_1);
      expect(state.registeredTourIds[1]).toBe(TOUR_2);
    });

    it('should not register the same tour twice and return relevant tour object', () => {
      const tour = tourQueue.register(TOUR_1);
      const duplicatedTour = tourQueue.register(TOUR_1);

      const state = tourQueue.getState();
      expect(state.registeredTourIds.filter((id) => id === TOUR_1)).toHaveLength(1);
      expect(tour.isActive()).toBe(true);
      expect(duplicatedTour.isActive()).toBe(true);
    });

    it('should notify subscribers when a tour is registered', () => {
      tourQueue.subscribe(subscriber);

      tourQueue.register(TOUR_1);
      tourQueue.register(TOUR_2);

      expect(subscriber).toHaveBeenCalledTimes(2);
    });
  });

  describe('getActive', () => {
    it('should return the first in order order registered tour', () => {
      tourQueue.register(TOUR_2);
      tourQueue.register(TOUR_1);

      expect(tourQueue.getActive()).toBe(TOUR_1);
    });

    it('should return the next tour after the first is completed', () => {
      const tour1 = tourQueue.register(TOUR_1);
      tourQueue.register(TOUR_2);

      tour1.complete();

      expect(tourQueue.getActive()).toBe(TOUR_2);
    });

    it('should return null when all tours are completed', () => {
      const tour1 = tourQueue.register(TOUR_1);
      const tour2 = tourQueue.register(TOUR_2);

      tour1.complete();
      tour2.complete();

      expect(tourQueue.getActive()).toBeNull();
    });

    it('should return null when queue is skipped', () => {
      const tour = tourQueue.register(TOUR_1);
      tour.skip();

      expect(tourQueue.getActive()).toBeNull();
    });
  });

  describe('Tour object', () => {
    describe('isActive', () => {
      it('should return true for the active tour and false for a waiting tour', () => {
        const tour1 = tourQueue.register(TOUR_1);
        const tour2 = tourQueue.register(TOUR_2);

        expect(tour1.isActive()).toBe(true);
        expect(tour2.isActive()).toBe(false);
      });

      it('should return false for a completed tour', () => {
        const tour = tourQueue.register(TOUR_1);
        tour.complete();

        expect(tour.isActive()).toBe(false);
      });

      it('should return false when queue is skipped', () => {
        const tour = tourQueue.register(TOUR_1);
        tour.skip();

        expect(tour.isActive()).toBe(false);
      });
    });
    describe('complete', () => {
      it('should mark the tour as completed', () => {
        const tour = tourQueue.register(TOUR_1);

        expect(tourQueue.getState().registeredTourIds).toContain(TOUR_1);
        expect(tourQueue.getState().completedTourIds.has(TOUR_1)).toBe(false);

        tour.complete();

        expect(tourQueue.getState().completedTourIds.has(TOUR_1)).toBe(true);
      });

      it('should notify subscribers when completed', () => {
        const tour = tourQueue.register(TOUR_1);
        tourQueue.subscribe(subscriber);

        tour.complete();

        expect(subscriber).toHaveBeenCalledTimes(1);
      });
    });

    describe('skip', () => {
      it('should skip all tours in the queue', () => {
        const tour1 = tourQueue.register(TOUR_1);
        tourQueue.register(TOUR_2);

        expect(tourQueue.getActive()).toBe(TOUR_1);

        tour1.skip();

        expect(tourQueue.getState().isQueueSkipped).toBe(true);
        expect(tourQueue.getActive()).toBeNull();
      });

      it('should notify subscribers when skipped', () => {
        const tour = tourQueue.register(TOUR_1);
        tourQueue.subscribe(subscriber);

        tour.skip();

        expect(subscriber).toHaveBeenCalledTimes(1);
      });
    });
    describe('unregister', () => {
      it('should remove tour from registered list', () => {
        const tour = tourQueue.register(TOUR_1);

        expect(tourQueue.getState().registeredTourIds).toContain(TOUR_1);

        tour.unregister();

        expect(tourQueue.getState().registeredTourIds).not.toContain(TOUR_1);
      });

      it('should notify subscribers', () => {
        const tour = tourQueue.register(TOUR_1);
        tourQueue.subscribe(subscriber);

        tour.unregister();

        expect(subscriber).toHaveBeenCalledTimes(1);
      });
    });
  });
});
