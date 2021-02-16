/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { collectorMock } from './collectors/mocks';

export const mockOsCollector = collectorMock.create();
jest.doMock('./collectors/os', () => ({
  OsMetricsCollector: jest.fn().mockImplementation(() => mockOsCollector),
}));

export const mockProcessCollector = collectorMock.create();
jest.doMock('./collectors/process', () => ({
  ProcessMetricsCollector: jest.fn().mockImplementation(() => mockProcessCollector),
}));

export const mockServerCollector = collectorMock.create();
jest.doMock('./collectors/server', () => ({
  ServerMetricsCollector: jest.fn().mockImplementation(() => mockServerCollector),
}));
