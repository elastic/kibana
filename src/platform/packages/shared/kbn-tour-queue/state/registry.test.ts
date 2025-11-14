/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TourId } from '..';
import { getTourQueueStateManager } from './registry';

describe('Registry: getTourQueueStateManager', () => {
  const REGISTRY_KEY = '__KIBANA_TOUR_QUEUE_CTX__';

  const TOUR_1 = 'tour1' as TourId;

  beforeEach(() => {
    // Clean up the global registry before each test
    if (typeof globalThis !== 'undefined') {
      delete (globalThis as any)[REGISTRY_KEY];
    }
  });

  it('should store the instance in globalThis registry', () => {
    const manager = getTourQueueStateManager();

    expect((globalThis as any)[REGISTRY_KEY]).toBeDefined();
    expect((globalThis as any)[REGISTRY_KEY].tourQueueStateManager).toBe(manager);
  });

  it('should return the same instance on multiple calls', () => {
    const manager1 = getTourQueueStateManager();
    const manager2 = getTourQueueStateManager();
    const manager3 = getTourQueueStateManager();

    expect(manager2).toBe(manager1);
    expect(manager3).toBe(manager1);
  });

  it('should share state across multiple calls', () => {
    const manager1 = getTourQueueStateManager();
    manager1.registerTour(TOUR_1);

    const manager2 = getTourQueueStateManager();
    const manager2State = manager2.getState();

    expect(manager2State.registeredTourIds).toContain(TOUR_1);
  });

  it('should reuse existing instance from registry if already created', () => {
    // First call creates the instance
    const firstManager = getTourQueueStateManager();

    // Verify it's in the registry
    const registryInstance = (globalThis as any)[REGISTRY_KEY]?.tourQueueStateManager;
    expect(registryInstance).toBe(firstManager);

    // Second call should return the same instance
    const secondManager = getTourQueueStateManager();
    expect(secondManager).toBe(registryInstance);
  });
});
