/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import {
  createTestEnv,
  configServiceMock as configMock,
  rawConfigServiceMock as rawMock,
} from '@kbn/config-mocks';

export const envCreateDefaultMock = vi.fn().mockImplementation(() => createTestEnv);
export const configServiceMock = vi.fn().mockImplementation(() => configMock.create());
export const rawConfigServiceMock = vi.fn().mockImplementation(() => rawMock.create());
vi.doMock('@kbn/config', () => {
      const mocked = {
      Env: {
        createDefault: envCreateDefaultMock,
      },
      ConfigService: configServiceMock,
      RawConfigService: rawConfigServiceMock,
    };
      return { ...mocked, default: mocked };
    });
