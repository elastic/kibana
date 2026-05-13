/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getConnectorActionErrorMeta,
  setConnectorActionErrorMeta,
  getFinitePositiveNumber,
  getHeaderValue,
  getResponseContentLengthBytes,
  getEstimatedBase64OutputBytes,
  ESTIMATED_JSON_OUTPUT_OVERHEAD_BYTES,
} from './connector_spec';

describe('getFinitePositiveNumber', () => {
  it.each([
    [42, 42],
    [0, 0],
    ['123', 123],
    ['0', 0],
  ])('returns %p as %p', (input, expected) => {
    expect(getFinitePositiveNumber(input)).toBe(expected);
  });

  it.each([
    [-1, undefined],
    [NaN, undefined],
    [Infinity, undefined],
    ['abc', undefined],
    [null, undefined],
    [undefined, undefined],
    [{}, undefined],
  ])('returns undefined for %p', (input, expected) => {
    expect(getFinitePositiveNumber(input)).toBe(expected);
  });
});

describe('getHeaderValue', () => {
  it('finds headers case-insensitively', () => {
    expect(
      getHeaderValue({ headers: { 'Content-Length': '42' }, headerName: 'content-length' })
    ).toBe('42');
  });

  it('returns undefined for missing header', () => {
    expect(
      getHeaderValue({ headers: { 'x-foo': 'bar' }, headerName: 'content-length' })
    ).toBeUndefined();
  });

  it('returns undefined for non-object headers', () => {
    expect(getHeaderValue({ headers: null, headerName: 'content-length' })).toBeUndefined();
    expect(getHeaderValue({ headers: 'string', headerName: 'content-length' })).toBeUndefined();
  });
});

describe('getResponseContentLengthBytes', () => {
  it('extracts from response headers', () => {
    const error = { response: { headers: { 'content-length': '1024' } } };
    expect(getResponseContentLengthBytes(error)).toBe(1024);
  });

  it('falls back to request.res.headers', () => {
    const error = { request: { res: { headers: { 'content-length': '2048' } } } };
    expect(getResponseContentLengthBytes(error)).toBe(2048);
  });

  it('prefers response headers over request headers', () => {
    const error = {
      response: { headers: { 'content-length': '100' } },
      request: { res: { headers: { 'content-length': '200' } } },
    };
    expect(getResponseContentLengthBytes(error)).toBe(100);
  });

  it('returns undefined for non-object errors', () => {
    expect(getResponseContentLengthBytes(null)).toBeUndefined();
    expect(getResponseContentLengthBytes('string')).toBeUndefined();
  });

  it('handles array header values', () => {
    const error = { response: { headers: { 'content-length': ['512', '1024'] } } };
    expect(getResponseContentLengthBytes(error)).toBe(512);
  });
});

describe('getEstimatedBase64OutputBytes', () => {
  it('computes base64 expansion plus overhead', () => {
    expect(getEstimatedBase64OutputBytes(3)).toBe(4 + ESTIMATED_JSON_OUTPUT_OVERHEAD_BYTES);
    expect(getEstimatedBase64OutputBytes(0)).toBe(ESTIMATED_JSON_OUTPUT_OVERHEAD_BYTES);
  });
});

describe('connector action error metadata', () => {
  it('stores and reads size metadata for object errors', () => {
    const error = new Error('boom');

    setConnectorActionErrorMeta(error, {
      contentLengthBytes: 1024,
      estimatedOutputBytes: 2048,
    });

    expect(getConnectorActionErrorMeta(error)).toEqual({
      contentLengthBytes: 1024,
      estimatedOutputBytes: 2048,
    });
  });

  it('merges metadata updates', () => {
    const error = new Error('boom');

    setConnectorActionErrorMeta(error, { contentLengthBytes: 1024 });
    setConnectorActionErrorMeta(error, { estimatedOutputBytes: 2048 });

    expect(getConnectorActionErrorMeta(error)).toEqual({
      contentLengthBytes: 1024,
      estimatedOutputBytes: 2048,
    });
  });

  it('ignores primitive errors', () => {
    setConnectorActionErrorMeta('boom', { contentLengthBytes: 1024 });

    expect(getConnectorActionErrorMeta('boom')).toBeUndefined();
  });
});
