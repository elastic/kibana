/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Attribute HTTP request allocations via Node heap-profile labels.
 * On when `v8.setHeapProfileLabels` exists; opt out with KBN_HEAP_PROFILE_LABELS=0.
 */

import v8 from 'v8';

export const HEAP_PROFILE_LABELS_ENV = 'KBN_HEAP_PROFILE_LABELS';

export interface HttpRouteHeapProfileLabels {
  readonly 'http.route': string;
  readonly 'http.request.method': string;
}

interface HeapProfileLabelsApi {
  setHeapProfileLabels?: (labels: Record<string, string>) => void;
}

const heapProfileApi = v8 as unknown as HeapProfileLabelsApi;

export function hasHeapProfileLabelsApi(): boolean {
  return typeof heapProfileApi.setHeapProfileLabels === 'function';
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

export function setHttpRouteHeapProfileLabels(request: {
  method?: string;
  route?: { path?: string };
}): void {
  const set = heapProfileApi.setHeapProfileLabels;
  if (!isHeapProfileLabelsEnabled() || typeof set !== 'function') {
    return;
  }
  const labels = httpRouteLabelsFromHapiRequest(request);
  if (!labels) {
    return;
  }
  set({ ...labels });
}
