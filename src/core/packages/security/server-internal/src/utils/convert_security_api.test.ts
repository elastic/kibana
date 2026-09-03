/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSecurityDelegateContract } from '@kbn/core-security-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { convertSecurityApi } from './convert_security_api';
import { createAuditLoggerMock } from '../test_helpers/create_audit_logger.mock';

describe('convertSecurityApi', () => {
  let source: CoreSecurityDelegateContract;

  beforeEach(() => {
    source = {
      authc: {
        getCurrentUser: jest.fn(),
        getRedactedSessionId: jest.fn(),
        apiKeys: {
          areAPIKeysEnabled: jest.fn(),
          areCrossClusterAPIKeysEnabled: jest.fn(),
          validate: jest.fn(),
          invalidate: jest.fn(),
          invalidateAsInternalUser: jest.fn(),
          grantAsInternalUser: jest.fn(),
          cloneAsInternalUser: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          uiam: {
            grant: jest.fn(),
            invalidate: jest.fn(),
            convert: jest.fn(),
            getInternalCallerAttestationHeaders: jest.fn(),
          },
        },
      },
      audit: {
        asScoped: jest.fn().mockReturnValue(createAuditLoggerMock.create()),
        withoutRequest: createAuditLoggerMock.create(),
      },
      serviceAccounts: {
        isEnabled: jest.fn(),
        create: jest.fn(),
        // POC ONLY — see CoreServiceAccountsService.exchangeToken for the full rationale.
        exchangeToken: jest.fn(),
        attachWorkload: jest.fn(),
        detachWorkload: jest.fn(),
        getWorkloadBinding: jest.fn(),
        withScopedRequestForWorkload: jest.fn(),
      },
      fakeRequestEnricher: jest.fn(),
    };
  });

  it('passes through delegate apiKeys, audit, and getRedactedSessionId', () => {
    const output = convertSecurityApi(source);
    expect(output.authc.apiKeys).toBe(source.authc.apiKeys);
    expect(output.authc.getRedactedSessionId).toBe(source.authc.getRedactedSessionId);
    expect(output.audit.asScoped).toBe(source.audit.asScoped);
    expect(output.audit.withoutRequest).toBe(source.audit.withoutRequest);
  });

  describe('serviceAccounts', () => {
    it('exposes the start-contract methods', () => {
      const output = convertSecurityApi(source);

      expect(output.serviceAccounts.isEnabled).toBe(source.serviceAccounts.isEnabled);
      expect(output.serviceAccounts.create).toBe(source.serviceAccounts.create);
      // POC ONLY — see CoreServiceAccountsService.exchangeToken for the full rationale.
      expect(output.serviceAccounts.exchangeToken).toBe(source.serviceAccounts.exchangeToken);
    });

    // The workload methods take an operation type as an argument, so exposing them on the start
    // contract would let any plugin address any operation's bindings. A capability handle from
    // `registerOperation` is meant to be the only way to reach them.
    it('does not leak the operation-keyed workload methods', () => {
      const output = convertSecurityApi(source);

      expect(Object.keys(output.serviceAccounts).sort()).toEqual([
        'create',
        'exchangeToken',
        'isEnabled',
      ]);
    });
  });

  describe('getCurrentUser', () => {
    it('delegates directly to the source for real requests', () => {
      const output = convertSecurityApi(source);
      const request = httpServerMock.createKibanaRequest();

      output.authc.getCurrentUser(request);

      expect(source.authc.getCurrentUser).toHaveBeenCalledTimes(1);
      expect(source.authc.getCurrentUser).toHaveBeenCalledWith(request);
    });

    it('delegates directly to the source for fake requests (delegate owns the enrichment override)', () => {
      const output = convertSecurityApi(source);
      const request = httpServerMock.createFakeKibanaRequest({});

      output.authc.getCurrentUser(request);

      expect(source.authc.getCurrentUser).toHaveBeenCalledTimes(1);
      expect(source.authc.getCurrentUser).toHaveBeenCalledWith(request);
    });
  });
});
