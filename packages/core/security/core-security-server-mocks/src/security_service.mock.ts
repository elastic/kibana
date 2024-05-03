/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  SecurityServiceSetup,
  SecurityServiceStart,
  SecurityRequestHandlerContext,
} from '@kbn/core-security-server';
import type {
  InternalSecurityServiceSetup,
  InternalSecurityServiceStart,
} from '@kbn/core-security-server-internal';
import { auditServiceMock, type MockedAuditService } from './audit.mock';

const createSetupMock = () => {
  const mock: jest.Mocked<SecurityServiceSetup> = {
    registerSecurityDelegate: jest.fn(),
  };

  return mock;
};

export type SecurityStartMock = jest.MockedObjectDeep<Omit<SecurityServiceStart, 'audit'>> & {
  audit: MockedAuditService;
};

const createStartMock = (): SecurityStartMock => {
  const mock = {
    authc: {
      getCurrentUser: jest.fn(),
    },
    audit: auditServiceMock.create(),
  };

  return mock;
};

const createInternalSetupMock = () => {
  const mock: jest.Mocked<InternalSecurityServiceSetup> = {
    registerSecurityDelegate: jest.fn(),
  };

  return mock;
};

export type InternalSecurityStartMock = jest.MockedObjectDeep<
  Omit<InternalSecurityServiceStart, 'audit'>
> & {
  audit: MockedAuditService;
};

const createInternalStartMock = (): InternalSecurityStartMock => {
  const mock = {
    authc: {
      getCurrentUser: jest.fn(),
    },
    audit: auditServiceMock.create(),
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

const createRequestHandlerContextMock = () => {
  const mock: jest.MockedObjectDeep<SecurityRequestHandlerContext> = {
    authc: {
      getCurrentUser: jest.fn(),
    },
    audit: {
      logger: {
        log: jest.fn(),
        enabled: true,
      },
    },
  };
  return mock;
};

export const securityServiceMock = {
  create: createServiceMock,
  createSetup: createSetupMock,
  createStart: createStartMock,
  createInternalSetup: createInternalSetupMock,
  createInternalStart: createInternalStartMock,
  createRequestHandlerContext: createRequestHandlerContextMock,
};
