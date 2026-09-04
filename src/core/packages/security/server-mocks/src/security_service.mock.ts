/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SecurityServiceSetup,
  SecurityServiceStart,
  SecurityRequestHandlerContext,
  ServiceAccountOperationHandle,
} from '@kbn/core-security-server';
import type {
  InternalSecurityServiceSetup,
  InternalSecurityServiceStart,
} from '@kbn/core-security-server-internal';
import { createCoreUiamService } from '@kbn/core-security-server-internal';
import { apiKeysMock } from './api_keys.mock';
import { auditServiceMock, type MockedAuditService } from './audit.mock';
import type { MockAuthenticatedUserProps } from '@kbn/core-security-common/mocks';
import { mockAuthenticatedUser } from '@kbn/core-security-common/mocks';
import { lazyObject } from '@kbn/lazy-object';

const createServiceAccountOperationHandleMock =
  (): jest.MockedObjectDeep<ServiceAccountOperationHandle> =>
    lazyObject({
      attach: jest.fn(),
      detach: jest.fn(),
      getBinding: jest.fn().mockResolvedValue(null),
      withScopedRequest: jest.fn(),
    });

const createSetupMock = () => {
  const mock: jest.Mocked<SecurityServiceSetup> = lazyObject({
    registerSecurityDelegate: jest.fn(),
    acquireFakeRequestEnricher: jest.fn().mockReturnValue(jest.fn()),
    fips: { isEnabled: jest.fn() },
    serviceAccounts: lazyObject({
      registerOperation: jest.fn(createServiceAccountOperationHandleMock),
    }),
  });

  return mock;
};

export type SecurityStartMock = jest.MockedObjectDeep<Omit<SecurityServiceStart, 'audit'>> & {
  audit: MockedAuditService;
};

const createStartMock = (): SecurityStartMock => {
  const mock = lazyObject({
    authc: lazyObject({
      getCurrentUser: jest.fn(),
      getRedactedSessionId: jest.fn().mockResolvedValue(undefined),
      apiKeys: apiKeysMock.create(),
    }),
    audit: auditServiceMock.create(),
    serviceAccounts: lazyObject({
      isEnabled: jest.fn().mockReturnValue(false),
      create: jest.fn(),
      // POC ONLY — see CoreServiceAccountsService.exchangeToken for the full rationale.
      exchangeToken: jest.fn(),
    }),
  });

  return mock;
};

const createInternalSetupMock = () => {
  // Back the mock with the real CoreUiamService so tests exercise the actual attach/attestation
  // logic, wrap the method in a jest.fn so callers can still spy on / override it.
  const uiam = createCoreUiamService('some-shared-secret');
  const mock: jest.Mocked<InternalSecurityServiceSetup> = lazyObject({
    registerSecurityDelegate: jest.fn(),
    acquireFakeRequestEnricher: jest.fn().mockReturnValue(jest.fn()),
    fips: { isEnabled: jest.fn() },
    serviceAccounts: lazyObject({
      registerOperation: jest.fn(createServiceAccountOperationHandleMock),
    }),
    uiam: {
      getElasticsearchClientAuthentication: jest.fn(uiam.getElasticsearchClientAuthentication),
    },
  });

  return mock;
};

export type InternalSecurityStartMock = jest.MockedObjectDeep<
  Omit<InternalSecurityServiceStart, 'audit'>
> & {
  audit: MockedAuditService;
};

const createInternalStartMock = (): InternalSecurityStartMock => {
  const mock = lazyObject({
    authc: lazyObject({
      getCurrentUser: jest.fn(),
      getRedactedSessionId: jest.fn().mockResolvedValue(undefined),
      apiKeys: apiKeysMock.create(),
    }),
    audit: auditServiceMock.create(),
    serviceAccounts: lazyObject({
      isEnabled: jest.fn().mockReturnValue(false),
      create: jest.fn(),
      // POC ONLY — see CoreServiceAccountsService.exchangeToken for the full rationale.
      exchangeToken: jest.fn(),
    }),
  });

  return mock;
};

const createServiceMock = () => {
  const mock = lazyObject({
    setup: jest.fn().mockReturnValue(createSetupMock()),
    start: jest.fn().mockReturnValue(createStartMock()),
    stop: jest.fn(),
  });

  return mock;
};

const createRequestHandlerContextMock = () => {
  const mock: jest.MockedObjectDeep<SecurityRequestHandlerContext> = lazyObject({
    authc: lazyObject({
      getCurrentUser: jest.fn(),
      apiKeys: lazyObject({
        areAPIKeysEnabled: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        validate: jest.fn(),
        invalidate: jest.fn(),
        uiam: {
          grant: jest.fn(),
          invalidate: jest.fn(),
          convert: jest.fn(),
        },
      }),
    }),
    audit: lazyObject({
      logger: lazyObject({
        log: jest.fn(),
        enabled: true,
        includeSavedObjectNames: false,
      }),
    }),
  });
  return mock;
};

export const securityServiceMock = {
  create: createServiceMock,
  createSetup: createSetupMock,
  createServiceAccountOperationHandle: createServiceAccountOperationHandleMock,
  createStart: createStartMock,
  createInternalSetup: createInternalSetupMock,
  createInternalStart: createInternalStartMock,
  createRequestHandlerContext: createRequestHandlerContextMock,
  createMockAuthenticatedUser: (props: MockAuthenticatedUserProps = {}) =>
    mockAuthenticatedUser(props),
};
