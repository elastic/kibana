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
    const manager = getTourQueue();

    expect((globalThis as any)[REGISTRY_KEY]).toBeDefined();
    expect((globalThis as any)[REGISTRY_KEY].tourQueueStateManager).toBe(manager);
  });

  it('should return the same instance on multiple calls', () => {
    const manager1 = getTourQueue();
    const manager2 = getTourQueue();
    const manager3 = getTourQueue();

    expect(manager2).toBe(manager1);
    expect(manager3).toBe(manager1);
  });

  it('should share state across multiple calls', () => {
    const manager1 = getTourQueue();
    manager1.registerTour(TOUR_1);

    const manager2 = getTourQueue();
    const manager2State = manager2.getState();

    expect(manager2State.registeredTourIds).toContain(TOUR_1);
  });

  it('should reuse existing instance from registry if already created', () => {
    // First call creates the instance
    const firstManager = getTourQueue();

    // Verify it's in the registry
    const registryInstance = (globalThis as any)[REGISTRY_KEY]?.tourQueueStateManager;
    expect(registryInstance).toBe(firstManager);

    // Second call should return the same instance
    const secondManager = getTourQueue();
    expect(secondManager).toBe(registryInstance);
  });
});
