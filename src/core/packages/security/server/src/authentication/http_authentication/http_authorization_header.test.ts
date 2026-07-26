/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FakeRequest } from '@kbn/core-elasticsearch-server';

import { HTTPAuthorizationHeader } from './http_authorization_header';

const createFakeRequest = (headers: Record<string, string | string[]> = {}): FakeRequest => ({
  headers,
});

describe('HTTPAuthorizationHeader.parseFromRequest()', () => {
  it('returns `null` if request does not have authorization header', () => {
    expect(HTTPAuthorizationHeader.parseFromRequest(createFakeRequest())).toBeNull();
  });

  it('returns `null` if authorization header value is not a string', () => {
    expect(
      HTTPAuthorizationHeader.parseFromRequest(
        createFakeRequest({ authorization: ['Basic xxx', 'Bearer xxx'] as any })
      )
    ).toBeNull();
  });

  it('returns `null` if authorization header value is an empty string', () => {
    expect(
      HTTPAuthorizationHeader.parseFromRequest(createFakeRequest({ authorization: '' }))
    ).toBeNull();
  });

  it('parses scheme portion of the authorization header value', () => {
    const headerValueAndSchemeMap = [
      ['Basic xxx', 'Basic'],
      ['Basic xxx yyy', 'Basic'],
      ['basic xxx', 'basic'],
      ['basic', 'basic'],
      // We don't trim leading whitespaces in scheme.
      [' Basic xxx', ''],
      ['Negotiate xxx', 'Negotiate'],
      ['negotiate xxx', 'negotiate'],
      ['negotiate', 'negotiate'],
      ['ApiKey xxx', 'ApiKey'],
      ['apikey xxx', 'apikey'],
      ['Api Key xxx', 'Api'],
    ];

    for (const [authorization, scheme] of headerValueAndSchemeMap) {
      const header = HTTPAuthorizationHeader.parseFromRequest(createFakeRequest({ authorization }));
      expect(header).not.toBeNull();
      expect(header!.scheme).toBe(scheme);
    }
  });

  it('parses credentials portion of the authorization header value', () => {
    const headerValueAndCredentialsMap = [
      ['xxx fOo', 'fOo'],
      ['xxx fOo bAr', 'fOo bAr'],
      // We don't trim leading whitespaces in scheme.
      [' xxx fOo', 'xxx fOo'],
    ];

    for (const [authorization, credentials] of headerValueAndCredentialsMap) {
      const header = HTTPAuthorizationHeader.parseFromRequest(createFakeRequest({ authorization }));
      expect(header).not.toBeNull();
      expect(header!.credentials).toBe(credentials);
    }
  });

  it('parses custom headers', () => {
    const mockRequest = createFakeRequest({ 'es-client-authentication': 'SharedSecret secret' });

    // Doesn't parse custom headers by default.
    expect(HTTPAuthorizationHeader.parseFromRequest(mockRequest)).toBeNull();

    const header = HTTPAuthorizationHeader.parseFromRequest(
      mockRequest,
      'es-client-authentication'
    );
    expect(header).not.toBeNull();
    expect(header?.scheme).toBe('SharedSecret');
    expect(header?.credentials).toBe('secret');
  });
});

describe('toString()', () => {
  it('concatenates scheme and credentials using a space', () => {
    const header = new HTTPAuthorizationHeader('Bearer', 'some-access-token');

    expect(header.toString()).toEqual('Bearer some-access-token');
  });
});
