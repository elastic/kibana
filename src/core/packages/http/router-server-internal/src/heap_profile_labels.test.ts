/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockWithHeapProfileLabels = jest.fn((_labels: Record<string, string>, fn: () => unknown) =>
  fn()
);

jest.mock('v8', () => ({
  withHeapProfileLabels: (labels: Record<string, string>, fn: () => unknown) =>
    mockWithHeapProfileLabels(labels, fn),
}));

import {
  HEAP_PROFILE_LABELS_ENV,
  httpRouteLabelsFromHapiRequest,
  withHttpRouteHeapProfileLabels,
} from './heap_profile_labels';

describe('withHttpRouteHeapProfileLabels', () => {
  const previous = process.env[HEAP_PROFILE_LABELS_ENV];
  const labels = {
    'http.route': '/api/status',
    'http.request.method': 'GET',
  };

  afterEach(() => {
    mockWithHeapProfileLabels.mockClear();
    if (previous === undefined) {
      delete process.env[HEAP_PROFILE_LABELS_ENV];
    } else {
      process.env[HEAP_PROFILE_LABELS_ENV] = previous;
    }
  });

  test('applies labels when the API exists', async () => {
    delete process.env[HEAP_PROFILE_LABELS_ENV];
    const result = await withHttpRouteHeapProfileLabels(labels, async () => 7);
    expect(result).toBe(7);
    expect(mockWithHeapProfileLabels).toHaveBeenCalledWith(labels, expect.any(Function));
  });

  test('httpRouteLabelsFromHapiRequest requires path and method', () => {
    expect(httpRouteLabelsFromHapiRequest({})).toBeUndefined();
    expect(httpRouteLabelsFromHapiRequest({ method: 'get' })).toBeUndefined();
    expect(
      httpRouteLabelsFromHapiRequest({ method: 'get', route: { path: '/api/status' } })
    ).toEqual({
      'http.route': '/api/status',
      'http.request.method': 'GET',
    });
  });

  test('passthrough when KBN_HEAP_PROFILE_LABELS=0', async () => {
    process.env[HEAP_PROFILE_LABELS_ENV] = '0';
    const result = await withHttpRouteHeapProfileLabels(labels, async () => 3);
    expect(result).toBe(3);
    expect(mockWithHeapProfileLabels).not.toHaveBeenCalled();
  });
});

describe('withHttpRouteHeapProfileLabels without the API', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('v8', () => ({}));
  });

  afterEach(() => {
    jest.resetModules();
    jest.dontMock('v8');
  });

  test('passthrough when the API is absent', async () => {
    const { withHttpRouteHeapProfileLabels: wrap } = await import('./heap_profile_labels');
    const result = await wrap(
      { 'http.route': '/api/status', 'http.request.method': 'GET' },
      async () => 9
    );
    expect(result).toBe(9);
  });
});
