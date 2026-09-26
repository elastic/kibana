/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockSetHeapProfileLabels = jest.fn();

jest.mock('v8', () => ({
  setHeapProfileLabels: (labels: Record<string, string>) => mockSetHeapProfileLabels(labels),
}));

import {
  HEAP_PROFILE_LABELS_ENV,
  httpRouteLabelsFromHapiRequest,
  setHttpRouteHeapProfileLabels,
} from './heap_profile_labels';

describe('setHttpRouteHeapProfileLabels', () => {
  const previous = process.env[HEAP_PROFILE_LABELS_ENV];

  afterEach(() => {
    mockSetHeapProfileLabels.mockClear();
    if (previous === undefined) {
      delete process.env[HEAP_PROFILE_LABELS_ENV];
    } else {
      process.env[HEAP_PROFILE_LABELS_ENV] = previous;
    }
  });

  test('sets labels from the hapi request when the API exists', () => {
    delete process.env[HEAP_PROFILE_LABELS_ENV];
    setHttpRouteHeapProfileLabels({ method: 'get', route: { path: '/api/status' } });
    expect(mockSetHeapProfileLabels).toHaveBeenCalledWith({
      'http.route': '/api/status',
      'http.request.method': 'GET',
    });
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

  test('no-op when KBN_HEAP_PROFILE_LABELS=0', () => {
    process.env[HEAP_PROFILE_LABELS_ENV] = '0';
    setHttpRouteHeapProfileLabels({ method: 'get', route: { path: '/api/status' } });
    expect(mockSetHeapProfileLabels).not.toHaveBeenCalled();
  });

  test('no-op when path or method is missing', () => {
    delete process.env[HEAP_PROFILE_LABELS_ENV];
    setHttpRouteHeapProfileLabels({});
    expect(mockSetHeapProfileLabels).not.toHaveBeenCalled();
  });
});

describe('setHttpRouteHeapProfileLabels without the API', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('v8', () => ({}));
  });

  afterEach(() => {
    jest.resetModules();
    jest.dontMock('v8');
  });

  test('no-op when the API is absent', async () => {
    const { setHttpRouteHeapProfileLabels: setLabels } = await import('./heap_profile_labels');
    expect(() => setLabels({ method: 'get', route: { path: '/api/status' } })).not.toThrow();
  });
});
