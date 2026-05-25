/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { normalizeAuthorizationHeaderValue } from './oauth_authz_code_and_ears_helpers';

describe('normalizeAuthorizationHeaderValue()', () => {
  it('rewrites lowercase bearer scheme to title-case Bearer', () => {
    expect(normalizeAuthorizationHeaderValue('bearer eyJtoken')).toBe('Bearer eyJtoken');
  });

  it('preserves title-case Bearer scheme unchanged', () => {
    expect(normalizeAuthorizationHeaderValue('Bearer eyJtoken')).toBe('Bearer eyJtoken');
  });

  it('does not rewrite all-uppercase BEARER scheme', () => {
    expect(normalizeAuthorizationHeaderValue('BEARER eyJtoken')).toBe('BEARER eyJtoken');
  });

  it('trims leading and trailing whitespace before checking scheme', () => {
    expect(normalizeAuthorizationHeaderValue('  bearer eyJtoken  ')).toBe('Bearer eyJtoken');
  });

  it('trims whitespace from non-bearer values', () => {
    expect(normalizeAuthorizationHeaderValue('  Basic dXNlcjpwYXNz  ')).toBe('Basic dXNlcjpwYXNz');
  });

  it('does not rewrite "bearer" without a trailing space', () => {
    expect(normalizeAuthorizationHeaderValue('bearer')).toBe('bearer');
  });

  it('handles an empty string', () => {
    expect(normalizeAuthorizationHeaderValue('')).toBe('');
  });

  it('handles a whitespace-only string', () => {
    expect(normalizeAuthorizationHeaderValue('   ')).toBe('');
  });

  it('preserves the token portion verbatim after rewriting the scheme', () => {
    const token = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.signature';
    expect(normalizeAuthorizationHeaderValue(`bearer ${token}`)).toBe(`Bearer ${token}`);
  });
});
