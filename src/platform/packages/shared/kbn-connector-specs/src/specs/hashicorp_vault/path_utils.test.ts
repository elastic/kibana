/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateVaultAddress, encodeVaultPathSegments, buildVaultUrl } from './path_utils';

describe('validateVaultAddress', () => {
  it('accepts a bare https origin and returns it normalized', () => {
    expect(validateVaultAddress('https://vault.example.com:8200')).toBe(
      'https://vault.example.com:8200'
    );
  });

  it('accepts an https origin with no explicit port', () => {
    expect(validateVaultAddress('https://vault.example.com')).toBe('https://vault.example.com');
  });

  it('rejects non-URL strings', () => {
    expect(() => validateVaultAddress('not a url')).toThrow(/valid absolute URL/);
  });

  it('rejects http (non-TLS)', () => {
    expect(() => validateVaultAddress('http://vault.example.com:8200')).toThrow(/https/);
  });

  it('rejects an address with an embedded path', () => {
    expect(() => validateVaultAddress('https://vault.example.com/some/path')).toThrow(
      /must not include a path/
    );
  });

  it('rejects an address with a query string', () => {
    expect(() => validateVaultAddress('https://vault.example.com?x=1')).toThrow(
      /query string or fragment/
    );
  });

  it('rejects an address with a fragment', () => {
    expect(() => validateVaultAddress('https://vault.example.com#frag')).toThrow(
      /query string or fragment/
    );
  });

  it('rejects an address with embedded credentials', () => {
    expect(() => validateVaultAddress('https://user:pass@vault.example.com')).toThrow(
      /embedded credentials/
    );
  });

  it('never echoes the input value in the error message', () => {
    const canary = 'CANARY-9f3e2ab1-do-not-log';
    try {
      validateVaultAddress(`https://user:${canary}@vault.example.com`);
      throw new Error('expected validateVaultAddress to throw');
    } catch (error) {
      expect((error as Error).message).not.toContain(canary);
    }
  });
});

describe('encodeVaultPathSegments', () => {
  it('percent-encodes each segment and rejoins with slashes', () => {
    expect(encodeVaultPathSegments('secret/data/my app')).toBe('secret/data/my%20app');
  });

  it('rejects an empty path', () => {
    expect(() => encodeVaultPathSegments('')).toThrow(/must not be empty/);
  });

  it('rejects a leading slash', () => {
    expect(() => encodeVaultPathSegments('/secret/data/foo')).toThrow(/leading or trailing slash/);
  });

  it('rejects a trailing slash', () => {
    expect(() => encodeVaultPathSegments('secret/data/foo/')).toThrow(/leading or trailing slash/);
  });

  it('rejects a double slash (empty segment)', () => {
    expect(() => encodeVaultPathSegments('secret//foo')).toThrow(/empty, '\.', or '\.\.'/);
  });

  it('rejects a "." segment', () => {
    expect(() => encodeVaultPathSegments('secret/./foo')).toThrow(/empty, '\.', or '\.\.'/);
  });

  it('rejects a ".." segment (path traversal)', () => {
    expect(() => encodeVaultPathSegments('secret/../foo')).toThrow(/empty, '\.', or '\.\.'/);
  });

  it('uses a custom field label in the error message', () => {
    expect(() => encodeVaultPathSegments('', 'mountPath')).toThrow(/Vault mountPath/);
  });
});

describe('buildVaultUrl', () => {
  it('joins origin, fixed prefix segments, and the encoded path', () => {
    expect(buildVaultUrl('https://vault.example.com:8200', ['v1'], 'secret/data/foo')).toBe(
      'https://vault.example.com:8200/v1/secret/data/foo'
    );
  });

  it('percent-encodes only the caller-supplied path, not the fixed prefix', () => {
    expect(buildVaultUrl('https://vault.example.com:8200', ['v1'], 'secret/data/my app')).toBe(
      'https://vault.example.com:8200/v1/secret/data/my%20app'
    );
  });
});
