/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Attribute HTTP handler allocations via Node heap-profile labels.
 * On when `v8.withHeapProfileLabels` exists; opt out with KBN_HEAP_PROFILE_LABELS=0.
 */

import v8 from 'v8';

export const HEAP_PROFILE_LABELS_ENV = 'KBN_HEAP_PROFILE_LABELS';

export interface HttpRouteHeapProfileLabels {
  readonly 'http.route': string;
  readonly 'http.request.method': string;
}

interface HeapProfileLabelsApi {
  withHeapProfileLabels?: <T>(labels: Record<string, string>, fn: () => T) => T;
}

const heapProfileApi = v8 as unknown as HeapProfileLabelsApi;

export function hasHeapProfileLabelsApi(): boolean {
  return typeof heapProfileApi.withHeapProfileLabels === 'function';
}

export function isHeapProfileLabelsEnabled(): boolean {
  return process.env[HEAP_PROFILE_LABELS_ENV] !== '0' && hasHeapProfileLabelsApi();
}

export function httpRouteLabelsFromHapiRequest(request: {
  method?: string;
  route?: { path?: string };
}): HttpRouteHeapProfileLabels | undefined {
  const path = request.route?.path;
  const method = request.method;
  if (typeof path !== 'string' || typeof method !== 'string') {
    return undefined;
  }
  return {
    'http.route': path,
    'http.request.method': method.toUpperCase(),
  };
}

export function withHttpRouteHeapProfileLabels<T>(
  labels: HttpRouteHeapProfileLabels,
  run: () => T
): T {
  const wrap = heapProfileApi.withHeapProfileLabels;
  if (!isHeapProfileLabelsEnabled() || typeof wrap !== 'function') {
    return run();
  }
  return wrap({ ...labels }, run);
}
