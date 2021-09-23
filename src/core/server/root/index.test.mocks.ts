/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggingSystemMock } from '../logging/logging_system.mock';
export const logger = loggingSystemMock.create();
jest.doMock('../logging/logging_system', () => ({
  LoggingSystem: jest.fn(() => logger),
}));

const realKbnConfig = jest.requireActual('@kbn/config');

import { configServiceMock, rawConfigServiceMock } from '../config/mocks';
export const configService = configServiceMock.create();
export const rawConfigService = rawConfigServiceMock.create();
jest.doMock('@kbn/config', () => ({
  ...realKbnConfig,
  ConfigService: jest.fn(() => configService),
  RawConfigService: jest.fn(() => rawConfigService),
}));

export const mockServer = {
  setupCoreConfig: jest.fn(),
  preboot: jest.fn(),
  setup: jest.fn(),
  stop: jest.fn(),
  configService,
};
jest.mock('../server', () => ({ Server: jest.fn(() => mockServer) }));
