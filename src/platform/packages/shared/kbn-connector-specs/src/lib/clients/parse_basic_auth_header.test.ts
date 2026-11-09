/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseBasicAuthHeader } from './parse_basic_auth_header';

describe('parseBasicAuthHeader', () => {
  it('decodes a well-formed Basic header', () => {
    const header = `Basic ${Buffer.from('alice:secret').toString('base64')}`;
    expect(parseBasicAuthHeader(header)).toEqual({ username: 'alice', password: 'secret' });
  });

  it('splits on the first colon only, so passwords may contain colons', () => {
    const header = `Basic ${Buffer.from('user:p:a:s:s').toString('base64')}`;
    expect(parseBasicAuthHeader(header)).toEqual({ username: 'user', password: 'p:a:s:s' });
  });

  it('is case-insensitive on the "Basic" scheme', () => {
    const header = `basic ${Buffer.from('alice:secret').toString('base64')}`;
    expect(parseBasicAuthHeader(header)).toEqual({ username: 'alice', password: 'secret' });
  });

  it('returns null for a non-Basic scheme', () => {
    expect(parseBasicAuthHeader('Bearer some-token')).toBeNull();
  });

  it('returns null when the decoded value has no colon', () => {
    const header = `Basic ${Buffer.from('no-colon-here').toString('base64')}`;
    expect(parseBasicAuthHeader(header)).toBeNull();
  });
});
