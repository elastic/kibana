/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseCurl } from './parse_curl';

const unwrap = (input: string) => {
  const result = parseCurl(input);
  if (!result.ok) {
    throw new Error(`Expected parse to succeed, got: ${result.error}`);
  }
  return result.value;
};

describe('parseCurl', () => {
  it('parses a simple GET with just a URL', () => {
    const parsed = unwrap('curl https://api.example.com/v2/users');
    expect(parsed.method).toBe('get');
    expect(parsed.url).toBe('https://api.example.com/v2/users');
    expect(parsed.headers).toEqual({});
    expect(parsed.body).toBeUndefined();
  });

  it('reads an explicit method (case-insensitive)', () => {
    expect(unwrap('curl -X POST https://api.example.com/x').method).toBe('post');
    expect(unwrap('curl --request delete https://api.example.com/x').method).toBe('delete');
  });

  it('defaults to POST when a body is present without an explicit method', () => {
    const parsed = unwrap(`curl https://api.example.com/x -d '{"a":1}'`);
    expect(parsed.method).toBe('post');
    expect(parsed.body).toEqual({ a: 1 });
    expect(parsed.isJsonBody).toBe(true);
  });

  it('keeps a non-JSON body as a raw string', () => {
    const parsed = unwrap(`curl https://api.example.com/x --data 'hello=world'`);
    expect(parsed.body).toBe('hello=world');
    expect(parsed.isJsonBody).toBe(false);
  });

  it('collects non-auth headers and preserves their casing', () => {
    const parsed = unwrap(
      `curl https://api.example.com/x -H 'Content-Type: application/json' -H 'X-Custom: 42'`
    );
    expect(parsed.headers).toEqual({
      'Content-Type': 'application/json',
      'X-Custom': '42',
    });
  });

  it('strips Authorization and other auth headers from headers', () => {
    const parsed = unwrap(
      `curl https://api.example.com/x -H 'Authorization: Bearer secret' -H 'x-api-key: k' -H 'Accept: application/json'`
    );
    expect(parsed.headers).toEqual({ Accept: 'application/json' });
    expect(parsed.strippedAuth.headerNames).toEqual(
      expect.arrayContaining(['Authorization', 'x-api-key'])
    );
  });

  it('strips -u/--user basic auth and records it', () => {
    const parsed = unwrap('curl -u user:pass https://api.example.com/x');
    expect(parsed.strippedAuth.hadUserFlag).toBe(true);
  });

  it('supports --header=value and --request=value equals syntax', () => {
    const parsed = unwrap(
      `curl --request=PUT --header='Content-Type: application/json' https://api.example.com/x`
    );
    expect(parsed.method).toBe('put');
    expect(parsed.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('handles multi-line commands with backslash continuations', () => {
    const parsed = unwrap(`curl -X POST \\
      https://api.example.com/v2/messages \\
      -H 'Content-Type: application/json' \\
      -d '{"text":"hi"}'`);
    expect(parsed.method).toBe('post');
    expect(parsed.url).toBe('https://api.example.com/v2/messages');
    expect(parsed.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(parsed.body).toEqual({ text: 'hi' });
  });

  it('ignores boolean flags and value flags it does not care about', () => {
    const parsed = unwrap(
      `curl -sSL --compressed -o out.json --max-time 30 https://api.example.com/x`
    );
    expect(parsed.url).toBe('https://api.example.com/x');
  });

  it('preserves the query string on the URL', () => {
    const parsed = unwrap('curl "https://api.example.com/search?q=hello&limit=5"');
    expect(parsed.url).toBe('https://api.example.com/search?q=hello&limit=5');
  });

  it('normalizes a bare host to https', () => {
    const parsed = unwrap('curl api.example.com/x');
    expect(parsed.url).toBe('https://api.example.com/x');
  });

  it('errors on empty input', () => {
    const result = parseCurl('   ');
    expect(result.ok).toBe(false);
  });

  it('errors when no URL is present', () => {
    const result = parseCurl('curl -X GET -H "Accept: application/json"');
    expect(result.ok).toBe(false);
  });

  it('errors on an unsupported method', () => {
    const result = parseCurl('curl -X OPTIONS https://api.example.com/x');
    expect(result.ok).toBe(false);
  });
});
