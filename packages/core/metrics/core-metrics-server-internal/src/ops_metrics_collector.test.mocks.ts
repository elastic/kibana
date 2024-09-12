/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { collectorMock } from '@kbn/core-metrics-collectors-server-mocks';

export const mockOsCollector = collectorMock.create();
export const mockProcessCollector = collectorMock.create();
export const mockServerCollector = collectorMock.create();
export const mockEsClientCollector = collectorMock.create();

jest.doMock('@kbn/core-metrics-collectors-server-internal', () => {
  return {
    OsMetricsCollector: jest.fn().mockImplementation(() => mockOsCollector),
    ProcessMetricsCollector: jest.fn().mockImplementation(() => mockProcessCollector),
    ServerMetricsCollector: jest.fn().mockImplementation(() => mockServerCollector),
    ElasticsearchClientsMetricsCollector: jest.fn().mockImplementation(() => mockEsClientCollector),
  };
});
