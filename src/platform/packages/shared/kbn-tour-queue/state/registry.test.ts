/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TourId } from '..';
import { getTourQueue } from './registry';

describe('Registry: getTourQueue', () => {
  const REGISTRY_KEY = '__KIBANA_TOUR_QUEUE_CTX__';

  const TOUR_1 = 'tour1' as TourId;

  beforeEach(() => {
    // Clean up the global registry before each test
    if (typeof globalThis !== 'undefined') {
      delete (globalThis as any)[REGISTRY_KEY];
    }
  });

  it('should store the instance in globalThis registry', () => {
    const tourQueue = getTourQueue();

    expect((globalThis as any)[REGISTRY_KEY]).toBeDefined();
    expect((globalThis as any)[REGISTRY_KEY].tourQueueStateManager).toBe(tourQueue);
  });

  it('should return the same instance on multiple calls', () => {
    const tourQueue1 = getTourQueue();
    const tourQueue2 = getTourQueue();
    const tourQueue3 = getTourQueue();

    expect(tourQueue2).toBe(tourQueue1);
    expect(tourQueue3).toBe(tourQueue1);
  });

  it('should share state across multiple calls', () => {
    const tourQueue1 = getTourQueue();
    tourQueue1.register(TOUR_1);

    const tourQueue2 = getTourQueue();
    const tourQueue2State = tourQueue2.getState();

    expect(tourQueue2State.registeredTourIds).toContain(TOUR_1);
  });

  it('should reuse existing instance from registry if already created', () => {
    // First call creates the instance
    const firstTourQueue = getTourQueue();

    // Verify it's in the registry
    const registryInstance = (globalThis as any)[REGISTRY_KEY]?.tourQueueStateManager;
    expect(registryInstance).toBe(firstTourQueue);

    // Second call should return the same instance
    const secondTourQueue = getTourQueue();
    expect(secondTourQueue).toBe(registryInstance);
  });
});
