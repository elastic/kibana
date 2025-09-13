/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LAZY_REQUIRE_IMMEDIATE } from './constants';

export const factories = new Set<Function>();

export function __lazyRequire(factory: Function): Record<string, unknown> {
  const box: { value?: unknown } = {};

  if ((globalThis as any)[LAZY_REQUIRE_IMMEDIATE] === true) {
    box.value = factory();
    return box;
  }

  function apply() {
    const val = factory();
    Object.defineProperty(box, 'value', {
      configurable: true, // keep configurable so tests can reconfigure if needed
      enumerable: true,
      writable: true, // allow overwriting for tests/mocking
      value: val,
    });
    factories.delete(apply);
    return val;
  }

  factories.add(apply);

  Object.defineProperty(box, 'value', {
    configurable: true, // so we can redefine it into a data property
    enumerable: true,
    get() {
      return apply();
    },
    set(next) {
      Object.defineProperty(box, 'value', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: next,
      });
    },
  });

  return box;
}
