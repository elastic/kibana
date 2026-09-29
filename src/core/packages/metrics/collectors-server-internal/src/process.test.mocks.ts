/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { collectorMock } from './mocks_internal';

export const mockEventLoopDelayMonitor = collectorMock.create();
vi.doMock('./event_loop_delays_monitor', () => {
  const mocked = {
    EventLoopDelaysMonitor: vi.fn().mockImplementation(() => mockEventLoopDelayMonitor),
  };
  return { ...mocked, default: mocked };
});

export const mockEventLoopUtilizationMonitor = collectorMock.create();
vi.doMock('./event_loop_utilization_monitor', () => {
  const mocked = {
    EventLoopUtilizationMonitor: vi.fn().mockImplementation(() => mockEventLoopUtilizationMonitor),
  };
  return { ...mocked, default: mocked };
});
