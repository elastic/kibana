/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IConfigService } from '@kbn/config';
import type { KibanaRequest } from '@kbn/core-http-server';
import { credentialCacheScope, readSessionCookieName } from './credential_cache_scope';

const sessionCookieName = 'sid';

function request(headers: Record<string, string | string[] | undefined>, uuid = 'req-1') {
  return { headers, uuid } as unknown as KibanaRequest;
}

function scope(
  headers: Record<string, string | string[] | undefined>,
  uuid = 'req-1',
  cookieName: string | undefined = sessionCookieName
) {
  return credentialCacheScope(request(headers, uuid), cookieName);
}

describe('credentialCacheScope', () => {
  it('is stable for the same API key across requests', () => {
    const headers = { authorization: 'ApiKey aaa' };
    expect(scope(headers, 'one')).toBe(scope(headers, 'two'));
  });

  it('differs between API keys', () => {
    expect(scope({ authorization: 'ApiKey aaa' })).not.toBe(scope({ authorization: 'ApiKey bbb' }));
  });

  it('keys an API key by the key when a session cookie is also present', () => {
    expect(scope({ authorization: 'ApiKey aaa', cookie: 'sid=user-a' })).toBe(
      scope({ authorization: 'ApiKey aaa', cookie: 'sid=user-b' })
    );
    expect(scope({ authorization: 'ApiKey aaa', cookie: 'sid=user-a' })).not.toBe(
      scope({ authorization: 'ApiKey bbb', cookie: 'sid=user-a' })
    );
  });

  it('keys a browser session by the session cookie and ignores the bearer', () => {
    expect(scope({ authorization: 'Bearer old-token', cookie: 'locale=en; sid=user-a' })).toBe(
      scope({ authorization: 'Bearer new-token', cookie: 'sid=user-a; locale=en' })
    );
    expect(scope({ authorization: 'Bearer same-token', cookie: 'sid=user-a' })).not.toBe(
      scope({ authorization: 'Bearer same-token', cookie: 'sid=user-b' })
    );
  });

  it('uses the configured session cookie name', () => {
    expect(scope({ cookie: 'sid=ignored; my-sid=user-a' }, 'req-1', 'my-sid')).toBe(
      scope({ authorization: 'Bearer rotated', cookie: 'my-sid=user-a' }, 'req-2', 'my-sid')
    );
    expect(scope({ authorization: 'Bearer token', cookie: 'sid=user-a' }, 'req-1', 'my-sid')).toBe(
      scope({ authorization: 'Bearer token' }, 'req-2', 'my-sid')
    );
  });

  it('keys a bearer without a session cookie by that authorization header', () => {
    expect(scope({ authorization: 'Bearer token-a', cookie: 'locale=en' })).toBe(
      scope({ authorization: 'Bearer token-a' })
    );
    expect(scope({ authorization: 'Bearer token-a' })).not.toBe(
      scope({ authorization: 'Bearer token-b' })
    );
  });

  it('does not cache a request with no session cookie and no authorization', () => {
    expect(scope({ cookie: 'locale=en' }, 'req-a')).toBeNull();
    expect(scope({}, 'req-b')).toBeNull();
  });

  it('treats repeated authorization headers as part of the credential', () => {
    expect(scope({ authorization: ['Bearer aaa', 'Bearer bbb'] })).not.toBe(
      scope({ authorization: 'Bearer aaa' })
    );
  });
});

describe('readSessionCookieName', () => {
  function configService(atPathSync: IConfigService['atPathSync']): IConfigService {
    return { atPathSync } as IConfigService;
  }

  it('returns the configured cookie name', () => {
    const atPathSync = jest.fn().mockReturnValue({ cookieName: 'my-sid' });
    expect(readSessionCookieName(configService(atPathSync))).toBe('my-sid');
    expect(atPathSync).toHaveBeenCalledWith(['xpack', 'security']);
  });

  it('returns undefined when the security schema is not registered', () => {
    const atPathSync = jest.fn().mockImplementation(() => {
      throw new Error('No validation schema has been defined for [xpack.security]');
    });
    expect(readSessionCookieName(configService(atPathSync))).toBeUndefined();
  });

  it('returns undefined when the missing-schema message names a different path', () => {
    const atPathSync = jest.fn().mockImplementation(() => {
      throw new Error('No validation schema has been defined for [other.path]');
    });
    expect(readSessionCookieName(configService(atPathSync))).toBeUndefined();
  });

  it('rethrows unexpected config errors', () => {
    const atPathSync = jest.fn().mockImplementation(() => {
      throw new Error('config validation failed');
    });
    expect(() => readSessionCookieName(configService(atPathSync))).toThrow(
      'config validation failed'
    );
  });
});
