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
import { WorkloadTypeRegistry } from '../workload_type_registry';

describe('convertSecurityApi', () => {
  let source: CoreSecurityDelegateContract;
  let workloadTypes: WorkloadTypeRegistry;

  beforeEach(() => {
    workloadTypes = new WorkloadTypeRegistry();
    source = {
      authc: {
        getCurrentUser: jest.fn(),
        getPrincipal: jest.fn(),
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
            isOwnClientAuthentication: jest.fn(),
            isExternalApiKey: jest.fn(),
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
        bindWorkload: jest.fn(),
        unbindWorkload: jest.fn(),
        getWorkloadBinding: jest.fn(),
        withScopedRequestForWorkload: jest.fn(),
      },
      fakeRequestEnricher: jest.fn(),
    };
  });

  it('passes through delegate apiKeys, audit, and getRedactedSessionId', () => {
    const output = convertSecurityApi(source, workloadTypes);
    expect(output.authc.apiKeys).toBe(source.authc.apiKeys);
    expect(output.authc.getRedactedSessionId).toBe(source.authc.getRedactedSessionId);
    expect(output.audit.asScoped).toBe(source.audit.asScoped);
    expect(output.audit.withoutRequest).toBe(source.audit.withoutRequest);
  });

  describe('serviceAccounts', () => {
    // The delegate's workload methods take a plugin id as an argument, so exposing them directly
    // would let any plugin address any other plugin's bindings. Only the plugin-scoped view is
    // handed out, and the plugin context is what names the plugin.
    it('exposes only the plugin-scoped accessor', () => {
      const output = convertSecurityApi(source, workloadTypes);

      expect(Object.keys(output.serviceAccounts)).toEqual(['asScopedToPlugin']);
    });

    it('scopes the start contract to the given plugin', async () => {
      workloadTypes.register('alerting', { type: 'rule', name: 'Alerting rule' });
      const output = convertSecurityApi(source, workloadTypes);

      const scoped = output.serviceAccounts.asScopedToPlugin('alerting');
      expect(scoped.isEnabled).toBe(source.serviceAccounts.isEnabled);
      expect(scoped.create).toBe(source.serviceAccounts.create);

      const params = { workloadType: 'rule', workloadId: 'rule-id', spaceId: 'default' };
      await scoped.getWorkloadBinding(params);
      expect(source.serviceAccounts.getWorkloadBinding).toHaveBeenCalledWith('alerting', params);
    });
  });

  describe('getCurrentUser', () => {
    it('delegates directly to the source for real requests', () => {
      const output = convertSecurityApi(source, workloadTypes);
      const request = httpServerMock.createKibanaRequest();

      output.authc.getCurrentUser(request);

      expect(source.authc.getCurrentUser).toHaveBeenCalledTimes(1);
      expect(source.authc.getCurrentUser).toHaveBeenCalledWith(request);
    });

    it('delegates directly to the source for fake requests (delegate owns the enrichment override)', () => {
      const output = convertSecurityApi(source, workloadTypes);
      const request = httpServerMock.createFakeKibanaRequest({});

      output.authc.getCurrentUser(request);

      expect(source.authc.getCurrentUser).toHaveBeenCalledTimes(1);
      expect(source.authc.getCurrentUser).toHaveBeenCalledWith(request);
    });
  });

  describe('getPrincipal', () => {
    it('delegates directly to the source', () => {
      const output = convertSecurityApi(source, workloadTypes);
      const request = httpServerMock.createKibanaRequest();

      output.authc.getPrincipal(request);

      expect(source.authc.getPrincipal).toHaveBeenCalledTimes(1);
      expect(source.authc.getPrincipal).toHaveBeenCalledWith(request);
    });
  });
});
