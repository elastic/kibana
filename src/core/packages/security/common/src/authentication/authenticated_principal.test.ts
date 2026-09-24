/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AuthenticatedUser } from './authenticated_user';
import { mockAuthenticatedUser } from './authenticated_user.mock';
import {
  CLOUD_SERVICE_ACCOUNT_REALM_TYPE,
  getAuthenticatedPrincipal,
  SERVICE_ACCOUNT_REALM_TYPE,
} from './authenticated_principal';

const HTTP_PROVIDER = { type: 'http', name: '__http__' };

describe('getAuthenticatedPrincipal', () => {
  it('classifies an anonymous provider user as anonymous', () => {
    expect(
      getAuthenticatedPrincipal(
        mockAuthenticatedUser({
          username: 'anonymous_user',
          authentication_provider: { type: 'anonymous', name: 'anonymous1' },
        })
      )
    ).toEqual({ type: 'anonymous', username: 'anonymous_user' });
  });

  it.each(['basic', 'token', 'saml', 'oidc', 'pki', 'kerberos'])(
    'classifies a %s session user as a user with their profile',
    (providerType) => {
      expect(
        getAuthenticatedPrincipal(
          mockAuthenticatedUser({
            username: 'jdoe',
            profile_uid: 'u_jdoe',
            authentication_provider: { type: providerType, name: `${providerType}1` },
          })
        )
      ).toEqual({ type: 'user', username: 'jdoe', userProfileId: 'u_jdoe' });
    }
  );

  it('omits the profile id entirely when the user has none', () => {
    const principal = getAuthenticatedPrincipal(
      mockAuthenticatedUser({ username: 'jdoe', profile_uid: undefined })
    );
    expect(principal).toEqual({ type: 'user', username: 'jdoe' });
    expect(Object.keys(principal)).not.toContain('userProfileId');
  });

  it('does not read the fields that throw on minimally authenticated users', () => {
    const minUser = new Proxy(
      mockAuthenticatedUser({
        username: 'jdoe',
        profile_uid: 'u_jdoe',
        authentication_provider: { type: 'saml', name: 'saml1' },
      }),
      {
        get: (target, prop, receiver) => {
          if (
            [
              'authentication_realm',
              'lookup_realm',
              'authentication_type',
              'elastic_cloud_user',
            ].includes(String(prop))
          ) {
            throw new Error(
              `Property "${String(prop)}" is not available for minimally authenticated users.`
            );
          }
          return Reflect.get(target, prop, receiver);
        },
      }
    ) as AuthenticatedUser;

    expect(getAuthenticatedPrincipal(minUser)).toEqual({
      type: 'user',
      username: 'jdoe',
      userProfileId: 'u_jdoe',
    });
  });

  it('classifies the fake-request enrichment override (username and profile only) as a user', () => {
    const enriched = { username: 'jdoe', profile_uid: 'u_jdoe' } as unknown as AuthenticatedUser;
    expect(getAuthenticatedPrincipal(enriched)).toEqual({
      type: 'user',
      username: 'jdoe',
      userProfileId: 'u_jdoe',
    });
  });

  it('classifies an Elasticsearch service account by its realm', () => {
    expect(
      getAuthenticatedPrincipal(
        mockAuthenticatedUser({
          username: 'kibana/nightshift-relay',
          authentication_provider: HTTP_PROVIDER,
          authentication_realm: {
            name: SERVICE_ACCOUNT_REALM_TYPE,
            type: SERVICE_ACCOUNT_REALM_TYPE,
          },
          lookup_realm: { name: SERVICE_ACCOUNT_REALM_TYPE, type: SERVICE_ACCOUNT_REALM_TYPE },
          authentication_type: 'token',
          profile_uid: undefined,
          http_authentication_scheme: 'bearer',
        })
      )
    ).toEqual({
      type: 'service_account',
      serviceAccountId: 'kibana/nightshift-relay',
      variant: 'stack',
    });
  });

  it('classifies a UIAM service account by its realm, using the verbatim _authenticate shape', () => {
    // Elasticsearch `_authenticate` response for a UIAM service account ephemeral token.
    const esAuthenticateResponse = {
      username: 'JHb4PA-cStyMYWVkKrIwpA',
      roles: ['admin'],
      full_name: null,
      email: null,
      metadata: {},
      enabled: true,
      authentication_realm: {
        name: CLOUD_SERVICE_ACCOUNT_REALM_TYPE,
        type: CLOUD_SERVICE_ACCOUNT_REALM_TYPE,
      },
      lookup_realm: {
        name: CLOUD_SERVICE_ACCOUNT_REALM_TYPE,
        type: CLOUD_SERVICE_ACCOUNT_REALM_TYPE,
      },
      authentication_type: 'token',
    };
    const user = {
      ...esAuthenticateResponse,
      authentication_provider: HTTP_PROVIDER,
      elastic_cloud_user: false,
      http_authentication_scheme: 'bearer',
    } as unknown as AuthenticatedUser;

    expect(getAuthenticatedPrincipal(user)).toEqual({
      type: 'service_account',
      serviceAccountId: 'JHb4PA-cStyMYWVkKrIwpA',
      variant: 'uiam',
    });
  });

  it('lets a service account realm win over an accompanying api_key block', () => {
    expect(
      getAuthenticatedPrincipal(
        mockAuthenticatedUser({
          username: 'elastic/kibana',
          authentication_provider: HTTP_PROVIDER,
          authentication_realm: {
            name: SERVICE_ACCOUNT_REALM_TYPE,
            type: SERVICE_ACCOUNT_REALM_TYPE,
          },
          api_key: { id: 'key-id', name: 'key', managed_by: 'elasticsearch' },
        })
      )
    ).toEqual({
      type: 'service_account',
      serviceAccountId: 'elastic/kibana',
      variant: 'stack',
    });
  });

  it('classifies a stack API key', () => {
    expect(
      getAuthenticatedPrincipal(
        mockAuthenticatedUser({
          username: 'creator',
          authentication_provider: HTTP_PROVIDER,
          authentication_realm: { name: '_es_api_key', type: '_es_api_key' },
          authentication_type: 'api_key',
          api_key: { id: 'stack-key-id', name: 'key', managed_by: 'elasticsearch' },
          http_authentication_scheme: 'apikey',
        })
      )
    ).toEqual({ type: 'api_key', apiKeyId: 'stack-key-id', variant: 'stack' });
  });

  it.each([true, false])('classifies a UIAM API key (internal: %p)', (internal) => {
    expect(
      getAuthenticatedPrincipal(
        mockAuthenticatedUser({
          username: '1234567890',
          authentication_provider: HTTP_PROVIDER,
          authentication_realm: { name: '_cloud_api_key', type: '_cloud_api_key' },
          authentication_type: 'api_key',
          api_key: { id: 'uiam-key-id', name: 'key', managed_by: 'cloud', internal },
          http_authentication_scheme: 'apikey',
        })
      )
    ).toEqual({ type: 'api_key', apiKeyId: 'uiam-key-id', variant: 'uiam' });
  });

  it.each([
    ['Basic', { name: 'native1', type: 'native' }, 'realm', 'basic'],
    ['Bearer token', { name: 'saml1', type: 'saml' }, 'token', 'bearer'],
    ['JWT', { name: 'jwt1', type: 'jwt' }, 'realm', 'bearer'],
    ['unknown realm', { name: 'future', type: '_future_realm' }, 'token', 'bearer'],
  ])(
    'classifies %s credentials over the http provider as a user (fail closed)',
    (_label, realm, authenticationType, scheme) => {
      expect(
        getAuthenticatedPrincipal(
          mockAuthenticatedUser({
            username: 'jdoe',
            profile_uid: undefined,
            authentication_provider: HTTP_PROVIDER,
            authentication_realm: realm,
            authentication_type: authenticationType,
            http_authentication_scheme: scheme,
          })
        )
      ).toEqual({ type: 'user', username: 'jdoe' });
    }
  );
});
