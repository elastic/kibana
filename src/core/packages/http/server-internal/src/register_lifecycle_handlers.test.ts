/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('./lifecycle_handlers', () => {
  const actual = jest.requireActual('./lifecycle_handlers');
  return {
    ...actual,
    createVersionCheckPostAuthHandler: jest.fn(actual.createVersionCheckPostAuthHandler),
    createBuildNrMismatchLoggerPreResponseHandler: jest.fn(
      actual.createBuildNrMismatchLoggerPreResponseHandler
    ),
    createXsrfPostAuthHandler: jest.fn(actual.createXsrfPostAuthHandler),
  };
});

import { createTestEnv } from '@kbn/config-mocks';
import type { HttpConfig } from './http_config';
import type { CoreHandlerDependencies } from './http_server';
import { registerCoreHandlers } from './register_lifecycle_handlers';

import {
  createVersionCheckPostAuthHandler,
  createBuildNrMismatchLoggerPreResponseHandler,
  createXsrfPostAuthHandler,
} from './lifecycle_handlers';
import { loggerMock } from '@kbn/logging-mocks';

const createRegistrarMock = (authGet = jest.fn()) =>
  ({
    registerAuth: jest.fn(),
    registerOnPostAuth: jest.fn(),
    registerOnPreAuth: jest.fn(),
    registerOnPreResponse: jest.fn(),
    registerOnPreRouting: jest.fn(),
    auth: { get: authGet, isAuthenticated: jest.fn() },
  } as unknown as CoreHandlerDependencies);

const createConfigMock = () =>
  ({
    csp: { header: '' },
    xsrf: { disableProtection: false, allowlist: [], allowedSchemes: [] },
    versioned: {
      versionResolution: 'newest',
      strictClientVersionCheck: false,
    },
  } as unknown as HttpConfig);

describe('registerCoreHandlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers client version checking only when strictClientVersionCheck is enabled', () => {
    const registrarMock = createRegistrarMock();
    const config = createConfigMock();
    const logger = loggerMock.create();

    registerCoreHandlers(registrarMock, config, createTestEnv(), logger);
    expect(createVersionCheckPostAuthHandler).toHaveBeenCalledTimes(0);
    expect(createBuildNrMismatchLoggerPreResponseHandler).toHaveBeenCalledTimes(1); // we do expect to register a logger

    config.versioned.strictClientVersionCheck = true;
    registerCoreHandlers(registrarMock, config, createTestEnv(), logger);
    expect(createVersionCheckPostAuthHandler).toHaveBeenCalledTimes(1);
    expect(createBuildNrMismatchLoggerPreResponseHandler).toHaveBeenCalledTimes(1); // logger registration should not be called again
  });

  it('gives the xsrf post-auth handler the registrar auth accessor', () => {
    const authGet = jest.fn();
    const registrarMock = createRegistrarMock(authGet);
    const config = createConfigMock();
    const logger = loggerMock.create();

    registerCoreHandlers(registrarMock, config, createTestEnv(), logger);

    expect(createXsrfPostAuthHandler).toHaveBeenCalledWith(config, authGet);
  });
});
