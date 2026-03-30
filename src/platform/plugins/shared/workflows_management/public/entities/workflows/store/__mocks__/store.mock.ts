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

export type MockServices = ReturnType<typeof createStartServicesMock>;

const storeToServices = new WeakMap<ReturnType<typeof createWorkflowsStore>, MockServices>();

export const createMockStore = (services?: WorkflowsServices) => {
  const mockServices = (services as MockServices | undefined) ?? createStartServicesMock();
  const store = createWorkflowsStore(mockServices);
  storeToServices.set(store, mockServices);
  return store;
};

export type MockStore = ReturnType<typeof createMockStore>;

export const getMockServices = (store: MockStore): MockServices => {
  const services = storeToServices.get(store);
  if (!services) {
    throw new Error('No mock services found for store — was it created with createMockStore?');
  }
  return services;
};
