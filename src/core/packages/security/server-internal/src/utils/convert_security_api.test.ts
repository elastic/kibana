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
import type { CoreFakeRequestEnrichment } from './convert_security_api';
import {
  ENRICHED_USER_PLACEHOLDER,
  convertSecurityApi,
  createFakeRequestEnrichment,
} from './convert_security_api';
import { createAuditLoggerMock } from '../test_helpers/create_audit_logger.mock';

describe('createFakeRequestEnrichment', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  it('returns an enricher and an override getter bound to the same WeakMap', () => {
    const { enrichRequestWithUserProfile, getOverride } = createFakeRequestEnrichment(logger);
    const request = httpServerMock.createFakeKibanaRequest({});

    expect(getOverride(request)).toBeUndefined();

    enrichRequestWithUserProfile(request, 'u_test_profile_123');

    const override = getOverride(request);
    expect(override).toBeDefined();
    expect(override!.profile_uid).toBe('u_test_profile_123');
  });

  describe('enrichRequestWithUserProfile', () => {
    it('sets a minimal user with the given profile_uid on the fake request', () => {
      const { enrichRequestWithUserProfile, getOverride } = createFakeRequestEnrichment(logger);
      const request = httpServerMock.createFakeKibanaRequest({});

      enrichRequestWithUserProfile(request, 'u_test_profile_123');

      const user = getOverride(request);
      expect(user).toBeDefined();
      expect(user!.profile_uid).toBe('u_test_profile_123');
      expect(user!.authentication_realm.name).toBe('background_task');
      expect(user!.authentication_provider.name).toBe('background_task');
    });

    it('sets non-profile_uid identity fields to placeholder values', () => {
      const { enrichRequestWithUserProfile, getOverride } = createFakeRequestEnrichment(logger);
      const request = httpServerMock.createFakeKibanaRequest({});

      enrichRequestWithUserProfile(request, 'u_test_profile_123');

      const user = getOverride(request)!;
      expect(user.username).toBe(ENRICHED_USER_PLACEHOLDER);
      expect(user.authentication_type).toBe(ENRICHED_USER_PLACEHOLDER);
      expect(user.roles).toEqual([]);
      expect(user.authentication_realm).toEqual({
        name: 'background_task',
        type: 'background_task',
      });
      expect(user.lookup_realm).toEqual({
        name: 'background_task',
        type: 'background_task',
      });
      expect(user.authentication_provider).toEqual({
        type: 'background_task',
        name: 'background_task',
      });
    });

    it('does not affect other fake requests', () => {
      const { enrichRequestWithUserProfile, getOverride } = createFakeRequestEnrichment(logger);
      const enrichedRequest = httpServerMock.createFakeKibanaRequest({});
      const otherRequest = httpServerMock.createFakeKibanaRequest({});

      enrichRequestWithUserProfile(enrichedRequest, 'u_enriched');

      expect(getOverride(otherRequest)).toBeUndefined();
    });

    it('warns and does not populate the override when called on a real (non-fake) request', () => {
      const { enrichRequestWithUserProfile, getOverride } = createFakeRequestEnrichment(logger);
      const realRequest = httpServerMock.createKibanaRequest();

      enrichRequestWithUserProfile(realRequest, 'u_profile_123');

      expect(getOverride(realRequest)).toBeUndefined();
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('non-fake request'));
    });

    it('warns and keeps the original enrichment when called twice on the same fake request', () => {
      const { enrichRequestWithUserProfile, getOverride } = createFakeRequestEnrichment(logger);
      const request = httpServerMock.createFakeKibanaRequest({});

      enrichRequestWithUserProfile(request, 'u_first');
      enrichRequestWithUserProfile(request, 'u_second');

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('already-enriched'));
      expect(getOverride(request)!.profile_uid).toBe('u_first');
    });
  });
});

describe('convertSecurityApi', () => {
  let source: CoreSecurityDelegateContract;
  let fakeRequestEnrichment: CoreFakeRequestEnrichment;

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
          },
        },
      },
      audit: {
        asScoped: jest.fn().mockReturnValue(createAuditLoggerMock.create()),
        withoutRequest: createAuditLoggerMock.create(),
      },
    };
    fakeRequestEnrichment = {
      enrichRequestWithUserProfile: jest.fn(),
      getOverride: jest.fn(),
    };
  });

  it('passes through delegate apiKeys, audit, and getRedactedSessionId', () => {
    const output = convertSecurityApi(source, fakeRequestEnrichment);
    expect(output.authc.apiKeys).toBe(source.authc.apiKeys);
    expect(output.authc.getRedactedSessionId).toBe(source.authc.getRedactedSessionId);
    expect(output.audit.asScoped).toBe(source.audit.asScoped);
    expect(output.audit.withoutRequest).toBe(source.audit.withoutRequest);
  });

  describe('getCurrentUser', () => {
    it('delegates to the source for real (non-fake) requests without consulting the override', () => {
      const output = convertSecurityApi(source, fakeRequestEnrichment);
      const request = httpServerMock.createKibanaRequest();

      output.authc.getCurrentUser(request);

      expect(fakeRequestEnrichment.getOverride).not.toHaveBeenCalled();
      expect(source.authc.getCurrentUser).toHaveBeenCalledTimes(1);
      expect(source.authc.getCurrentUser).toHaveBeenCalledWith(request);
    });

    it('consults the override for fake requests and returns the enriched user when present', () => {
      const enrichedUser = { profile_uid: 'u_enriched' } as any;
      (fakeRequestEnrichment.getOverride as jest.Mock).mockReturnValue(enrichedUser);

      const output = convertSecurityApi(source, fakeRequestEnrichment);
      const request = httpServerMock.createFakeKibanaRequest({});

      const user = output.authc.getCurrentUser(request);

      expect(fakeRequestEnrichment.getOverride).toHaveBeenCalledWith(request);
      expect(source.authc.getCurrentUser).not.toHaveBeenCalled();
      expect(user).toBe(enrichedUser);
    });

    it('falls back to the delegate for fake requests when no override is present', () => {
      const delegateUser = { profile_uid: 'u_delegate' } as any;
      (fakeRequestEnrichment.getOverride as jest.Mock).mockReturnValue(undefined);
      (source.authc.getCurrentUser as jest.Mock).mockReturnValue(delegateUser);

      const output = convertSecurityApi(source, fakeRequestEnrichment);
      const request = httpServerMock.createFakeKibanaRequest({});

      const user = output.authc.getCurrentUser(request);

      expect(fakeRequestEnrichment.getOverride).toHaveBeenCalledWith(request);
      expect(source.authc.getCurrentUser).toHaveBeenCalledWith(request);
      expect(user).toBe(delegateUser);
    });
  });
});
