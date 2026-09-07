/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractErrorMessage } from './eis_setup';

describe('extractErrorMessage', () => {
  it('returns undefined for an empty body', () => {
    expect(extractErrorMessage('')).toBeUndefined();
    expect(extractErrorMessage('   ')).toBeUndefined();
  });

  it('extracts a top-level string `error` field', () => {
    expect(extractErrorMessage(JSON.stringify({ error: 'Invalid API key' }))).toBe(
      'Invalid API key'
    );
  });

  it('extracts `error.reason` from an ES-style structured error', () => {
    const body = JSON.stringify({
      error: {
        type: 'status_exception',
        reason:
          'Invalid host [https://inference.eu-west-1.aws.svc.qa.elastic.cloud/api/v2/authorizations], please check that the URL is correct.',
      },
    });
    expect(extractErrorMessage(body)).toBe(
      'Invalid host [https://inference.eu-west-1.aws.svc.qa.elastic.cloud/api/v2/authorizations], please check that the URL is correct.'
    );
  });

  it('falls back to `error.type` when `reason` is missing', () => {
    const body = JSON.stringify({ error: { type: 'status_exception' } });
    expect(extractErrorMessage(body)).toBe('status_exception');
  });

  it('falls back to a top-level `message` field when there is no `error`', () => {
    expect(extractErrorMessage(JSON.stringify({ message: 'boom' }))).toBe('boom');
  });

  it('falls back to the raw trimmed body for non-JSON responses', () => {
    expect(extractErrorMessage('  <html>502 Bad Gateway</html>  ')).toBe(
      '<html>502 Bad Gateway</html>'
    );
  });

  it('truncates very long raw bodies to 500 chars', () => {
    const long = 'x'.repeat(600);
    const result = extractErrorMessage(long)!;
    expect(result.endsWith('…')).toBe(true);
    expect(result.length).toBe(501); // 500 chars + ellipsis
  });

  it('falls back to raw text when JSON has neither error nor message', () => {
    const body = JSON.stringify({ status: 'nope' });
    expect(extractErrorMessage(body)).toBe(body);
  });
});
