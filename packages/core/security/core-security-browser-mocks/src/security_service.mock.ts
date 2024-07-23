/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SecurityServiceSetup, SecurityServiceStart } from '@kbn/core-security-browser';
import type {
  InternalSecurityServiceSetup,
  InternalSecurityServiceStart,
} from '@kbn/core-security-browser-internal';
import { mockAuthenticatedUser, MockAuthenticatedUserProps } from '@kbn/core-security-common/mocks';

const createSetupMock = () => {
  const mock: jest.Mocked<SecurityServiceSetup> = {
    registerSecurityDelegate: jest.fn(),
  };

  return mock;
};

const createStartMock = () => {
  const mock: jest.MockedObjectDeep<SecurityServiceStart> = {
    authc: {
      getCurrentUser: jest.fn(),
    },
  };

  return mock;
};

const createInternalSetupMock = () => {
  const mock: jest.Mocked<InternalSecurityServiceSetup> = {
    registerSecurityDelegate: jest.fn(),
  };

  return mock;
};

const createInternalStartMock = () => {
  const mock: jest.MockedObjectDeep<InternalSecurityServiceStart> = {
    authc: {
      getCurrentUser: jest.fn(),
    },
  };

  return mock;
};

const createServiceMock = () => {
  const mock = {
    setup: jest.fn().mockReturnValue(createSetupMock()),
    start: jest.fn().mockReturnValue(createStartMock()),
    stop: jest.fn(),
  };

  return mock;
};

export const securityServiceMock = {
  create: createServiceMock,
  createSetup: createSetupMock,
  createStart: createStartMock,
  createInternalSetup: createInternalSetupMock,
  createInternalStart: createInternalStartMock,
  createMockAuthenticatedUser: (props: MockAuthenticatedUserProps = {}) =>
    mockAuthenticatedUser(props),
};
