/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

describe('legacy Storage entry point', () => {
  it('does not access sessionStorage during import', () => {
    const sessionStorageDescriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage');
    if (!sessionStorageDescriptor) {
      throw new Error('Expected sessionStorage to be defined');
    }

    let sessionStorageAccessed = false;
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get: () => {
        sessionStorageAccessed = true;
        throw new Error('sessionStorage was accessed during import');
      },
    });

    try {
      expect(() => {
        jest.isolateModules(() => require('.'));
      }).not.toThrow();
      expect(sessionStorageAccessed).toBe(false);
    } finally {
      Object.defineProperty(window, 'sessionStorage', sessionStorageDescriptor);
    }
  });
});
