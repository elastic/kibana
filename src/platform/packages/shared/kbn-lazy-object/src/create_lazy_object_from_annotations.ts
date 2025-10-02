/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isLazyObjectDisabled } from './is_disabled';
import { LAZY_OBJECT_KEY_CALLED, LAZY_OBJECT_KEY_COUNT } from './metrics';

const LAZY_ANNOTATION_KEY = '@kbn/lazy-object/lazy-annotation' as const;

const DISABLED = isLazyObjectDisabled();

/**
 * Annotate a factory function to indicate the value should be lazily computed.
 * Without this, we can't differentiate between a plain function, and a lazified
 * getter.
 */
export function annotateLazy<T>(factory: () => T): () => T {
  // fallback string key, to not depend on
  if (!(LAZY_ANNOTATION_KEY in factory)) {
    Object.defineProperty(factory, LAZY_ANNOTATION_KEY, {
      value: 1,
      enumerable: false,
      configurable: false,
      writable: false,
    });
  }
  return factory;
}

/**
 * Create an object where only annotated properties are lazily evaluated.
 * Non-annotated properties are defined eagerly as writable value properties.
 */
export function createLazyObjectFromAnnotations<T extends Record<string, any>>(obj: T): T {
  const target: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const isAnnotated = typeof value === 'function' && value[LAZY_ANNOTATION_KEY] === 1;

    if (isAnnotated && !DISABLED) {
      globalThis[LAZY_OBJECT_KEY_COUNT]++;
      Object.defineProperty(target, key, {
        enumerable: true,
        configurable: true,
        get() {
          globalThis[LAZY_OBJECT_KEY_CALLED]++;
          const computed = value();
          Object.defineProperty(target, key, {
            value: computed,
            enumerable: true,
            configurable: true,
            writable: true,
          });
          return computed;
        },
        set(v) {
          // when set, simply override the lazy getter
          Object.defineProperty(target, key, {
            value: v,
            enumerable: true,
            configurable: true,
            writable: true,
          });
        },
      });

      continue;
    }
    // Either not annotated, or laziness disabled: define eagerly as a writable value
    Object.defineProperty(target, key, {
      value: isAnnotated ? value() : value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }

  return target as T;
}
