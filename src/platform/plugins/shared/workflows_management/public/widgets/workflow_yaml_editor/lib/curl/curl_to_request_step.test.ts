/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { curlToRequestStep } from './curl_to_request_step';

const unwrap = (connectorType: string, curl: string) => {
  const result = curlToRequestStep(connectorType, curl);
  if (!result.ok) {
    throw new Error(`Expected mapping to succeed, got: ${result.error}`);
  }
  return result;
};

describe('curlToRequestStep', () => {
  it('uses a relative path when the URL matches the connector base URL', () => {
    // Zoom has a static base URL of https://api.zoom.us.
    const result = unwrap('.zoom', 'curl -X POST https://api.zoom.us/v2/users/me');
    expect(result.stepType).toBe('zoom.request');
    expect(result.snippet).toContain('type: zoom.request');
    expect(result.snippet).toContain('method: post');
    expect(result.snippet).toContain('path: /v2/users/me');
    expect(result.snippet).not.toContain('url:');
    expect(result.notes.join(' ')).toContain('relative `path`');
  });

  it('keeps the query string on the path', () => {
    const result = unwrap('.zoom', 'curl "https://api.zoom.us/v2/users?status=active"');
    expect(result.snippet).toContain('path: /v2/users?status=active');
  });

  it('falls back to an absolute url when the host does not match the base URL', () => {
    const result = unwrap('.zoom', 'curl https://example.com/other/endpoint');
    expect(result.snippet).toContain('url: https://example.com/other/endpoint');
    expect(result.snippet).not.toContain('path:');
    expect(result.notes.join(' ')).toContain('absolute `url`');
  });

  it('uses an absolute url for connectors without a static base URL', () => {
    // amazon_s3 is multi-host: no resolvable static base URL.
    const result = unwrap('.amazon_s3', 'curl https://my-bucket.s3.amazonaws.com/key');
    expect(result.snippet).toContain('url: https://my-bucket.s3.amazonaws.com/key');
    expect(result.snippet).not.toContain('path:');
  });

  it('includes non-auth headers and the parsed body', () => {
    const result = unwrap(
      '.zoom',
      `curl -X POST https://api.zoom.us/v2/chat -H 'Content-Type: application/json' -d '{"message":"hi"}'`
    );
    expect(result.snippet).toContain('Content-Type: application/json');
    expect(result.snippet).toContain('message: hi');
  });

  it('strips auth headers and notes it', () => {
    const result = unwrap(
      '.zoom',
      `curl https://api.zoom.us/v2/users/me -H 'Authorization: Bearer secret'`
    );
    expect(result.snippet).not.toContain('Authorization');
    expect(result.snippet).not.toContain('secret');
    expect(result.notes.join(' ')).toContain('Removed authentication');
  });

  it('returns an error for a cURL command with no URL', () => {
    const result = curlToRequestStep('.zoom', 'curl -X GET -H "Accept: application/json"');
    expect(result.ok).toBe(false);
  });

  it('returns an error for empty input', () => {
    const result = curlToRequestStep('.zoom', '   ');
    expect(result.ok).toBe(false);
  });
});
