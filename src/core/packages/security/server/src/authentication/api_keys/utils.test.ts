/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractApiKeyIdFromAuthzHeader, decodeApiKeyId } from './utils';

describe('extractApiKeyIdFromAuthzHeader', () => {
  it('returns the API key ID from a valid ApiKey authorization header', () => {
    const id = 'my-api-key-id';
    const secret = 'my-api-key-secret';
    const encoded = Buffer.from(`${id}:${secret}`).toString('base64');
    expect(extractApiKeyIdFromAuthzHeader(`ApiKey ${encoded}`)).toBe(id);
  });

  it('is case-insensitive for the ApiKey prefix', () => {
    const id = 'test-id';
    const encoded = Buffer.from(`${id}:secret`).toString('base64');
    expect(extractApiKeyIdFromAuthzHeader(`apikey ${encoded}`)).toBe(id);
    expect(extractApiKeyIdFromAuthzHeader(`APIKEY ${encoded}`)).toBe(id);
    expect(extractApiKeyIdFromAuthzHeader(`aPiKeY ${encoded}`)).toBe(id);
  });

  it('returns undefined when the header is undefined', () => {
    expect(extractApiKeyIdFromAuthzHeader(undefined)).toBeUndefined();
  });

  it('returns undefined when the header is an array', () => {
    expect(extractApiKeyIdFromAuthzHeader(['ApiKey abc'])).toBeUndefined();
  });

  it('returns undefined when the header does not start with ApiKey prefix', () => {
    expect(extractApiKeyIdFromAuthzHeader('Bearer some-token')).toBeUndefined();
    expect(extractApiKeyIdFromAuthzHeader('Basic dXNlcjpwYXNz')).toBeUndefined();
  });

  it('returns the ID when there is no colon in the decoded value', () => {
    const encoded = Buffer.from('just-an-id').toString('base64');
    expect(extractApiKeyIdFromAuthzHeader(`ApiKey ${encoded}`)).toBe('just-an-id');
  });

  it('returns undefined when the decoded ID is empty', () => {
    const encoded = Buffer.from(':secret').toString('base64');
    expect(extractApiKeyIdFromAuthzHeader(`ApiKey ${encoded}`)).toBeUndefined();
  });
});

describe('decodeApiKeyId', () => {
  it('returns the API key ID from a base64-encoded api key', () => {
    const id = 'my-api-key-id';
    const secret = 'my-api-key-secret';
    const encoded = Buffer.from(`${id}:${secret}`).toString('base64');
    expect(decodeApiKeyId(encoded)).toBe(id);
  });

  it('returns the full decoded value when there is no colon', () => {
    const encoded = Buffer.from('just-an-id').toString('base64');
    expect(decodeApiKeyId(encoded)).toBe('just-an-id');
  });

  it('returns undefined when the decoded ID is empty', () => {
    const encoded = Buffer.from(':secret').toString('base64');
    expect(decodeApiKeyId(encoded)).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    expect(decodeApiKeyId('')).toBeUndefined();
  });

  it('returns undefined when the decoded ID is only whitespace', () => {
    const encoded = Buffer.from('  :secret').toString('base64');
    expect(decodeApiKeyId(encoded)).toBeUndefined();
  });
});
