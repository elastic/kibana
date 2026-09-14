/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHttpFetchErrorFromCause } from './http_fetch_error';

describe('createHttpFetchErrorFromCause', () => {
  const request = new Request('http://localhost/path');

  it('classifies empty window.fetch failures as AbortError', () => {
    const error = createHttpFetchErrorFromCause(new Error(''), request, undefined, undefined, true);

    expect(error.name).toBe('AbortError');
    expect(error.message).toBe('The user aborted a request.');
  });

  it('does not treat empty body-read failures as abort', () => {
    const error = createHttpFetchErrorFromCause(new Error(''), request);

    expect(error.name).toBe('Error');
    expect(error.message).toBe('Network request failed');
  });

  it('preserves AbortError name and message', () => {
    const cause = new DOMException('The operation was aborted.', 'AbortError');
    const error = createHttpFetchErrorFromCause(cause, request);

    expect(error.name).toBe('AbortError');
    expect(error.message).toBe('The operation was aborted.');
  });

  it('classifies an aborted request signal as AbortError', () => {
    const controller = new AbortController();
    controller.abort();
    const abortedRequest = new Request('http://localhost/path', { signal: controller.signal });
    const error = createHttpFetchErrorFromCause(new TypeError('Failed to fetch'), abortedRequest);

    expect(error.name).toBe('AbortError');
    expect(error.message).toBe('Failed to fetch');
  });

  it('uses a string rejection as the message', () => {
    const error = createHttpFetchErrorFromCause('Network!', request);

    expect(error.name).toBe('Error');
    expect(error.message).toBe('Network!');
  });
});
