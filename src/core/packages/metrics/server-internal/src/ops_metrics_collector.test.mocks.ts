/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { collectorMock } from '@kbn/core-metrics-collectors-server-mocks';

export const mockOsCollector = collectorMock.createMockWithRegisterMetrics();
export const mockProcessCollector = collectorMock.createMockWithRegisterMetrics();
export const mockServerCollector = collectorMock.create();
export const mockEsClientCollector = collectorMock.create();

vi.doMock('@kbn/core-metrics-collectors-server-internal', () => {
  return {
    OsMetricsCollector: vi.fn().mockImplementation(() => mockOsCollector),
    ProcessMetricsCollector: vi.fn().mockImplementation(() => mockProcessCollector),
    ServerMetricsCollector: vi.fn().mockImplementation(() => mockServerCollector),
    ElasticsearchClientsMetricsCollector: vi.fn().mockImplementation(() => mockEsClientCollector),
  };
});
