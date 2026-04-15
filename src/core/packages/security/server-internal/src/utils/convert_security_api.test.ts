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
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { convertSecurityApi } from './convert_security_api';
import { createAuditLoggerMock } from '../test_helpers/create_audit_logger.mock';

describe('convertSecurityApi', () => {
  let source: CoreSecurityDelegateContract;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
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
          },
        },
      },
      audit: {
        asScoped: jest.fn().mockReturnValue(createAuditLoggerMock.create()),
        withoutRequest: createAuditLoggerMock.create(),
      },
    };
  });

  it('passes through delegate apiKeys, audit, and getRedactedSessionId', () => {
    const output = convertSecurityApi(source, logger);
    expect(output.authc.apiKeys).toBe(source.authc.apiKeys);
    expect(output.authc.getRedactedSessionId).toBe(source.authc.getRedactedSessionId);
    expect(output.audit.asScoped).toBe(source.audit.asScoped);
    expect(output.audit.withoutRequest).toBe(source.audit.withoutRequest);
  });

  describe('getCurrentUser', () => {
    it('delegates to the source when no enrichment has been applied', () => {
      const output = convertSecurityApi(source, logger);
      const request = httpServerMock.createKibanaRequest();

      output.authc.getCurrentUser(request);

      expect(source.authc.getCurrentUser).toHaveBeenCalledTimes(1);
      expect(source.authc.getCurrentUser).toHaveBeenCalledWith(request);
    });

    it('returns the enriched user instead of delegating when the request has been enriched', () => {
      const output = convertSecurityApi(source, logger);
      const request = httpServerMock.createKibanaRequest();
      const profileId = 'u_test_profile_123';

      output.authc.enrichRequestWithUserProfile(request, profileId);

      const user = output.authc.getCurrentUser(request);

      expect(source.authc.getCurrentUser).not.toHaveBeenCalled();
      expect(user).not.toBeNull();
      expect(user!.profile_uid).toBe(profileId);
    });
  });

  describe('enrichRequestWithUserProfile', () => {
    it('sets a minimal user with the given profile_uid on the request', () => {
      const output = convertSecurityApi(source, logger);
      const request = httpServerMock.createKibanaRequest();
      const profileId = 'u_test_profile_123';

      output.authc.enrichRequestWithUserProfile(request, profileId);

      const user = output.authc.getCurrentUser(request);
      expect(user).not.toBeNull();
      expect(user!.profile_uid).toBe(profileId);
      expect(user!.authentication_realm.name).toBe('background_task');
      expect(user!.authentication_provider.name).toBe('background_task');
    });

    it('overrides delegate getCurrentUser for the enriched request', () => {
      const output = convertSecurityApi(source, logger);
      const request = httpServerMock.createKibanaRequest();

      const existingUser = { profile_uid: 'u_original' } as any;
      (source.authc.getCurrentUser as jest.Mock).mockReturnValue(existingUser);

      expect(output.authc.getCurrentUser(request)!.profile_uid).toBe('u_original');

      output.authc.enrichRequestWithUserProfile(request, 'u_enriched');

      const user = output.authc.getCurrentUser(request);
      expect(user!.profile_uid).toBe('u_enriched');
    });

    it('does not affect other requests', () => {
      const output = convertSecurityApi(source, logger);
      const enrichedRequest = httpServerMock.createKibanaRequest();
      const otherRequest = httpServerMock.createKibanaRequest();

      output.authc.enrichRequestWithUserProfile(enrichedRequest, 'u_enriched');

      output.authc.getCurrentUser(otherRequest);
      expect(source.authc.getCurrentUser).toHaveBeenCalledWith(otherRequest);
    });
  });
});
