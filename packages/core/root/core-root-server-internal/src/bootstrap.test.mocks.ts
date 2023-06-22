/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Env } from '@kbn/config';
import { rawConfigServiceMock, configServiceMock } from '@kbn/config-mocks';

export const mockConfigService = configServiceMock.create();
export const mockRawConfigService = rawConfigServiceMock.create();
export const mockRawConfigServiceConstructor = jest.fn(() => mockRawConfigService);
jest.doMock('@kbn/config', () => ({
  ConfigService: jest.fn(() => mockConfigService),
  Env,
  RawConfigService: jest.fn(mockRawConfigServiceConstructor),
}));

jest.doMock('./root', () => ({
  Root: jest.fn(() => ({
    shutdown: jest.fn(),
  })),
}));
