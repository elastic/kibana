/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
export const logger = loggingSystemMock.create();
vi.doMock('@kbn/core-logging-server-internal', () => {
      const mocked = {
      LoggingSystem: vi.fn(() => logger),
    };
      return { ...mocked, default: mocked };
    });

const realKbnConfig = (await vi.importActual('@kbn/config'));

import { configServiceMock, rawConfigServiceMock } from '@kbn/config-mocks';
export const configService = configServiceMock.create();
export const rawConfigService = rawConfigServiceMock.create();
vi.doMock('@kbn/config', () => {
      const mocked = {
      ...realKbnConfig,
      ConfigService: vi.fn(() => configService),
      RawConfigService: vi.fn(() => rawConfigService),
    };
      return { ...mocked, default: mocked };
    });

export const mockServer = {
  setupCoreConfig: vi.fn(),
  preboot: vi.fn(),
  setup: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  configService,
};
vi.mock('../server', () => {
      const mocked = { Server: vi.fn(() => mockServer) };
      return { ...mocked, default: mocked };
    });
