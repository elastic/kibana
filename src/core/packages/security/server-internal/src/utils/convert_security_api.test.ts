/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSecurityDelegateContract } from '@kbn/core-security-server';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { CoreFakeRequestEnrichment } from './convert_security_api';
import { convertSecurityApi, createFakeRequestEnrichment } from './convert_security_api';
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
    it('exposes the given profile_uid on the enriched user', () => {
      const { enrichRequestWithUserProfile, getOverride } = createFakeRequestEnrichment(logger);
      const request = httpServerMock.createFakeKibanaRequest({});

      enrichRequestWithUserProfile(request, 'u_test_profile_123');

      const user = getOverride(request);
      expect(user).toBeDefined();
      expect(user!.profile_uid).toBe('u_test_profile_123');
    });

    it.each<keyof AuthenticatedUser>([
      'username',
      'email',
      'full_name',
      'roles',
      'enabled',
      'metadata',
      'authentication_realm',
      'lookup_realm',
      'authentication_provider',
      'authentication_type',
      'elastic_cloud_user',
      'operator',
      'api_key',
    ])('throws when reading "%s" off the enriched user', (property) => {
      const { enrichRequestWithUserProfile, getOverride } = createFakeRequestEnrichment(logger);
      const request = httpServerMock.createFakeKibanaRequest({});

      enrichRequestWithUserProfile(request, 'u_test_profile_123');

      const user = getOverride(request)!;
      expect(() => user[property]).toThrow(
        new RegExp(`Property "${property}" is not available on a fake request enriched`)
      );
    });

    it.each(['someUnknownProp', 'then', 'toJSON'])(
      'returns undefined (not throw) for non-AuthenticatedUser string-keyed property "%s"',
      (property) => {
        const { enrichRequestWithUserProfile, getOverride } = createFakeRequestEnrichment(logger);
        const request = httpServerMock.createFakeKibanaRequest({});

        enrichRequestWithUserProfile(request, 'u_test_profile_123');

        const user = getOverride(request)! as unknown as Record<string, unknown>;
        expect(user[property]).toBeUndefined();
      }
    );

    it('allows symbol-keyed access so JS reflection on the enriched user does not throw', () => {
      const { enrichRequestWithUserProfile, getOverride } = createFakeRequestEnrichment(logger);
      const request = httpServerMock.createFakeKibanaRequest({});

      enrichRequestWithUserProfile(request, 'u_test_profile_123');

      const user = getOverride(request)!;
      // Reading well-known symbol-keyed properties must not throw.
      expect(() => (user as any)[Symbol.toPrimitive]).not.toThrow();
      expect(() => (user as any)[Symbol.toStringTag]).not.toThrow();
      expect(() => (user as any)[Symbol.iterator]).not.toThrow();
    });

    it('flows through Promise.resolve / async return without throwing on `.then`', async () => {
      const { enrichRequestWithUserProfile, getOverride } = createFakeRequestEnrichment(logger);
      const request = httpServerMock.createFakeKibanaRequest({});

      enrichRequestWithUserProfile(request, 'u_test_profile_123');

      // `Promise.resolve(value)` probes `value.then` to detect thenables;
      // the proxy must not throw. Mirrors the encrypted_saved_objects pattern.
      const asyncReturn = async () => getOverride(request);
      const resolved = await asyncReturn();
      expect(resolved!.profile_uid).toBe('u_test_profile_123');
    });

    it('serializes via JSON.stringify with only the profile_uid exposed', () => {
      const { enrichRequestWithUserProfile, getOverride } = createFakeRequestEnrichment(logger);
      const request = httpServerMock.createFakeKibanaRequest({});

      enrichRequestWithUserProfile(request, 'u_test_profile_123');

      const user = getOverride(request)!;
      expect(JSON.parse(JSON.stringify(user))).toEqual({ profile_uid: 'u_test_profile_123' });
    });

    it('returns a frozen enriched user', () => {
      const { enrichRequestWithUserProfile, getOverride } = createFakeRequestEnrichment(logger);
      const request = httpServerMock.createFakeKibanaRequest({});

      enrichRequestWithUserProfile(request, 'u_test_profile_123');

      const user = getOverride(request)!;
      expect(Object.isFrozen(user)).toBe(true);
    });

    it('does not affect other fake requests', () => {
      const { enrichRequestWithUserProfile, getOverride } = createFakeRequestEnrichment(logger);
      const enrichedRequest = httpServerMock.createFakeKibanaRequest({});
      const otherRequest = httpServerMock.createFakeKibanaRequest({});

      enrichRequestWithUserProfile(enrichedRequest, 'u_enriched');

      expect(getOverride(otherRequest)).toBeUndefined();
    });

    it('throws and does not populate the override when called on a real (non-fake) request', () => {
      const { enrichRequestWithUserProfile, getOverride } = createFakeRequestEnrichment(logger);
      const realRequest = httpServerMock.createKibanaRequest();

      expect(() => enrichRequestWithUserProfile(realRequest, 'u_profile_123')).toThrow(
        /must only be called on a fake request/
      );

      expect(getOverride(realRequest)).toBeUndefined();
      expect(logger.warn).not.toHaveBeenCalled();
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
