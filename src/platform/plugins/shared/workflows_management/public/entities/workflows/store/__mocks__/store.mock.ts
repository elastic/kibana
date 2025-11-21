/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createStartServicesMock } from '../../../../mocks';
import type { WorkflowsServices } from '../../../../types';
import { createWorkflowsStore } from '../store';
import type { RootState } from '../types';

export const createMockStore = (services?: WorkflowsServices) => {
  const mockServices = services || createStartServicesMock();
  const store = createWorkflowsStore(mockServices);

  // Attach services to the store for easy access in tests
  (store as any).mockServices = mockServices;

  return store;
};

export type MockStore = ReturnType<typeof createMockStore>;
export type MockServices = ReturnType<typeof createStartServicesMock>;

// Helper function to get mock services from a store
export const getMockServices = (store: MockStore): MockServices => {
  return (store as any).mockServices;
};

// Helper function to create a store with initial state
export const createMockStoreWithState = (
  initialState: Partial<RootState>,
  services?: WorkflowsServices
) => {
  const store = createMockStore(services);

  // Pre-populate the store with initial state
  if (initialState.detail) {
    Object.assign(store.getState().detail, initialState.detail);
  }

  return store;
};
