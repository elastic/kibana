/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CoreScopedAccessControl,
  CoreSecurityDelegateHandle,
  CoreServiceAccountsService,
  ResolvedServiceAccountWorkload,
  ServiceAccountBoundWorkloadRef,
  SecurityServiceSetup,
  SecurityServiceStart,
  SecurityRequestHandlerContext,
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

const createServiceAccountsStartMock = (): jest.MockedObjectDeep<CoreServiceAccountsService> =>
  lazyObject({
    isEnabled: jest.fn().mockReturnValue(false),
    create: jest.fn(),
    delete: jest.fn(),
    bindWorkload: jest.fn(),
    unbindWorkload: jest.fn(),
    getWorkloadBinding: jest.fn().mockResolvedValue(null),
    withScopedRequestForWorkload: jest.fn(),
  });

const createDelegateHandleMock = (): jest.MockedObjectDeep<CoreSecurityDelegateHandle> =>
  lazyObject({
    serviceAccounts: lazyObject({
      getWorkloadTypeName: jest.fn().mockReturnValue(undefined),
      resolveBoundWorkloads: jest
        .fn()
        .mockImplementation(
          async (
            bindings: ReadonlyArray<ServiceAccountBoundWorkloadRef>
          ): Promise<ResolvedServiceAccountWorkload[]> => bindings.map(() => ({}))
        ),
    }),
  });

const createSetupMock = () => {
  const mock: jest.Mocked<SecurityServiceSetup> = lazyObject({
    registerSecurityDelegate: jest.fn().mockImplementation(createDelegateHandleMock),
    acquireFakeRequestEnricher: jest.fn().mockReturnValue(jest.fn()),
    fips: { isEnabled: jest.fn() },
    serviceAccounts: lazyObject({
      registerWorkloadType: jest.fn(),
    }),
  });

  return mock;
};

// By default object-level security is disabled and allows everything, as before platform OLS.
const createScopedAccessControlMock = (): jest.Mocked<CoreScopedAccessControl> => ({
  isEnabled: jest.fn().mockReturnValue(false),
  getPrincipal: jest.fn().mockResolvedValue(undefined),
  evaluate: jest.fn(),
  authorize: jest.fn().mockResolvedValue(new Map()),
  filterVisible: jest.fn().mockImplementation(async ({ objects }) => objects),
  getReadFilter: jest.fn().mockResolvedValue(undefined),
  validateInitialAcl: jest.fn().mockResolvedValue(undefined),
  primeRecovery: jest.fn(),
});

const createAccessControlMock = () => {
  const scoped = createScopedAccessControlMock();
  return {
    isEnabled: jest.fn().mockReturnValue(false),
    asScoped: jest.fn().mockReturnValue(scoped),
    scoped,
  };
};

export type SecurityStartMock = jest.MockedObjectDeep<Omit<SecurityServiceStart, 'audit'>> & {
  audit: MockedAuditService;
};

const createStartMock = (): SecurityStartMock => {
  const mock = lazyObject({
    authc: lazyObject({
      getCurrentUser: jest.fn(),
      getPrincipal: jest.fn(),
      getRedactedSessionId: jest.fn().mockResolvedValue(undefined),
      apiKeys: apiKeysMock.create(),
    }),
    audit: auditServiceMock.create(),
    serviceAccounts: createServiceAccountsStartMock(),
    accessControl: createAccessControlMock(),
  });

  return mock;
};

const createInternalSetupMock = () => {
  // Back the mock with the real CoreUiamService so tests exercise the actual attach/attestation
  // logic, wrap the method in a jest.fn so callers can still spy on / override it.
  const uiam = createCoreUiamService('some-shared-secret');
  const mock: jest.Mocked<InternalSecurityServiceSetup> = lazyObject({
    registerSecurityDelegate: jest.fn().mockImplementation(createDelegateHandleMock),
    acquireFakeRequestEnricher: jest.fn().mockReturnValue(jest.fn()),
    fips: { isEnabled: jest.fn() },
    serviceAccounts: lazyObject({
      registerWorkloadType: jest.fn(),
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
      getPrincipal: jest.fn(),
      getRedactedSessionId: jest.fn().mockResolvedValue(undefined),
      apiKeys: apiKeysMock.create(),
    }),
    audit: auditServiceMock.create(),
    serviceAccounts: lazyObject({
      asScopedToPlugin: jest.fn().mockImplementation(createServiceAccountsStartMock),
    }),
    accessControl: createAccessControlMock(),
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
      getPrincipal: jest.fn(),
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
  createServiceAccounts: createServiceAccountsStartMock,
  createAccessControl: createAccessControlMock,
  createScopedAccessControl: createScopedAccessControlMock,
  createDelegateHandle: createDelegateHandleMock,
  createStart: createStartMock,
  createInternalSetup: createInternalSetupMock,
  createInternalStart: createInternalStartMock,
  createRequestHandlerContext: createRequestHandlerContextMock,
  createMockAuthenticatedUser: (props: MockAuthenticatedUserProps = {}) =>
    mockAuthenticatedUser(props),
};
