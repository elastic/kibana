/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { redactSensitiveHeaders } from './headers';

describe('redactSensitiveHeaders', () => {
  it('returns empty object when headers are undefined', () => {
    expect(redactSensitiveHeaders()).toEqual({});
  });

  it('returns a shallow clone of headers without redacting', () => {
    const headers = {
      'Content-Type': 'application/json',
      'X-Request-Id': 'abc123',
      'x-empty-header': '',
    };
    expect(redactSensitiveHeaders(headers)).toEqual(headers);
    expect(redactSensitiveHeaders(headers)).not.toBe(headers);
  });

  it('redacts sensitive headers', () => {
    const headers = {
      Authorization: 'Basic dXNlcjpwYXNzd29yZA==',
      Cookie: 'session=1234',
      'x-custom-header': 'abc',
      'x-empty-header': '',
    };

    const expected = {
      Authorization: '[REDACTED]',
      Cookie: '[REDACTED]',
      'x-custom-header': 'abc',
      'x-empty-header': '',
    };

    expect(redactSensitiveHeaders(headers)).toEqual(expected);
  });

  it('handles headers with array values', () => {
    const headers = {
      'Set-Cookie': ['cookie1=value1', 'cookie2=value2'],
    };

    const expected = {
      'Set-Cookie': ['[REDACTED]', '[REDACTED]'],
    };

    expect(redactSensitiveHeaders(headers)).toEqual(expected);
  });
});
