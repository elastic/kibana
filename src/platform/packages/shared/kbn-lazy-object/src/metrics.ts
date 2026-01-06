/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const LAZY_OBJECT_KEY_COUNT = '__LAZY_OBJECT_KEY_COUNT__';
export const LAZY_OBJECT_KEY_CALLED = '__LAZY_OBJECT_KEY_CALLED__';

// Extend the global 'var' declarations for NodeJS
declare global {
  // eslint-disable-next-line no-var
  var __LAZY_OBJECT_KEY_COUNT__: number;
  // eslint-disable-next-line no-var
  var __LAZY_OBJECT_KEY_CALLED__: number;
}

globalThis[LAZY_OBJECT_KEY_CALLED] = globalThis[LAZY_OBJECT_KEY_CALLED] || 0;
globalThis[LAZY_OBJECT_KEY_COUNT] = globalThis[LAZY_OBJECT_KEY_COUNT] || 0;

export function getLazyObjectMetrics(): { count: number; called: number } {
  return {
    count: globalThis[LAZY_OBJECT_KEY_COUNT],
    called: globalThis[LAZY_OBJECT_KEY_CALLED],
  };
}
