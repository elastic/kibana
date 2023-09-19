/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('./lifecycle_handlers', () => {
  const actual = jest.requireActual('./lifecycle_handlers');
  return {
    ...actual,
    createVersionCheckPostAuthHandler: jest.fn(actual.createVersionCheckPostAuthHandler),
  };
});

import { createTestEnv } from '@kbn/config-mocks';
import type { HttpConfig } from './http_config';
import { registerCoreHandlers } from './register_lifecycle_handlers';

import { createVersionCheckPostAuthHandler } from './lifecycle_handlers';

describe('registerCoreHandlers', () => {
  it('will not register client version checking if disabled via config', () => {
    const registrarMock = {
      registerAuth: jest.fn(),
      registerOnPostAuth: jest.fn(),
      registerOnPreAuth: jest.fn(),
      registerOnPreResponse: jest.fn(),
      registerOnPreRouting: jest.fn(),
    };

    const config = {
      csp: { header: '' },
      xsrf: {},
      versioned: {
        versionResolution: 'newest',
        strictClientVersionCheck: false,
      },
    } as unknown as HttpConfig;

    registerCoreHandlers(registrarMock, config, createTestEnv());
    expect(createVersionCheckPostAuthHandler).toHaveBeenCalledTimes(0);

    config.versioned.strictClientVersionCheck = true;
    registerCoreHandlers(registrarMock, config, createTestEnv());
    expect(createVersionCheckPostAuthHandler).toHaveBeenCalledTimes(1);
  });
});
