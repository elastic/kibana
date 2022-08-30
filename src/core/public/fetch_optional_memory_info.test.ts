/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fetchOptionalMemoryInfo } from './fetch_optional_memory_info';

describe('fetchOptionalMemoryInfo', () => {
  test('should return undefined if no memory info is available', () => {
    expect(fetchOptionalMemoryInfo()).toBeUndefined();
  });

  test('should return the memory info when available', () => {
    // @ts-expect-error 2339
    window.performance.memory = {
      get jsHeapSizeLimit() {
        return 3;
      },
      get totalJSHeapSize() {
        return 2;
      },
      get usedJSHeapSize() {
        return 1;
      },
    };
    expect(fetchOptionalMemoryInfo()).toEqual({
      jsHeapSizeLimit: 3,
      totalJSHeapSize: 2,
      usedJSHeapSize: 1,
    });
  });
});
