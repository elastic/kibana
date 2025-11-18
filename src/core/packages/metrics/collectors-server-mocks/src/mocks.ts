/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricsCollector } from '@kbn/core-metrics-server';
import { lazyObject } from '@kbn/lazy-object';
import { createMockOpsProcessMetrics } from './process.mocks';

const createMock = () => {
  const mocked: jest.Mocked<MetricsCollector<any>> = lazyObject({
    collect: jest.fn().mockResolvedValue({}),
    reset: jest.fn(),
  });

  return mocked;
};

const createMockWithRegisterMetrics = () =>
  lazyObject({
    ...createMock(),
    registerMetrics: jest.fn().mockResolvedValue({}),
  });

export const collectorMock = {
  create: createMock,
  createOpsProcessMetrics: createMockOpsProcessMetrics,
  createMockWithRegisterMetrics,
};
