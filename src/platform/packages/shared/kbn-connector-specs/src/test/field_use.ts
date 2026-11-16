/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * What a handler did with the response bodies of one vendor operation. Fields are named by their
 * path in the response schema: `name`, `owner/login`, `items/name` for the elements of an array
 * body, and `''` for the body itself.
 */
export interface FieldUse {
  /** Fields the handler read, whether the response had them or not. */
  readonly read: Set<string>;
  /** Objects the handler enumerated (a spread, `Object.keys`, `JSON.stringify`), copying fields. */
  readonly copied: Set<string>;
  /** Values the handler returned as they were, without reading into them. */
  readonly returned: Set<string>;
}

export const createFieldUse = (): FieldUse => ({
  read: new Set(),
  copied: new Set(),
  returned: new Set(),
});

// Properties that every object answers, or that runtimes and test tools ask for; not fields.
const NOT_FIELDS = new Set([
  'then',
  'toJSON',
  'constructor',
  '__proto__',
  'valueOf',
  'toString',
  'toLocaleString',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'asymmetricMatch',
  '$$typeof',
  'nodeType',
  'inspect',
]);

const tracked = new WeakMap<object, { readonly path: string; readonly use: FieldUse }>();

const join = (path: string, segment: string): string => (path ? `${path}/${segment}` : segment);

// Only parsed JSON is tracked: plain objects and arrays.
const isJsonContainer = (value: unknown): value is object => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (Array.isArray(value)) {
    return true;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

/**
 * Wraps a parsed response body so that what the handler does with it is recorded in `use`. Other
 * values are returned unchanged.
 */
export const trackFieldUse = <T>(value: T, use: FieldUse, path = ''): T => {
  if (!isJsonContainer(value)) {
    return value;
  }
  const isArray = Array.isArray(value);
  const children = new Map<string, unknown>();
  // Keys of an object being enumerated: reading them copies the object rather than reads a field.
  const enumerating = new Set<string | symbol>();
  const isField = (target: object, key: string): boolean =>
    isArray ? /^\d+$/.test(key) : Object.hasOwn(target, key) || !(key in Object.prototype);

  const proxy = new Proxy(value, {
    get(target, key, receiver) {
      const result = Reflect.get(target, key, receiver);
      if (typeof key === 'symbol' || NOT_FIELDS.has(key) || !isField(target, key)) {
        return result;
      }
      const field = isArray ? join(path, 'items') : join(path, key);
      if (enumerating.has(key)) {
        enumerating.delete(key);
      } else {
        use.read.add(field);
      }
      if (!isJsonContainer(result)) {
        return result;
      }
      if (!children.has(key)) {
        children.set(key, trackFieldUse(result, use, field));
      }
      return children.get(key);
    },
    has(target, key) {
      if (typeof key === 'string' && !isArray && !NOT_FIELDS.has(key)) {
        use.read.add(join(path, key));
      }
      return Reflect.has(target, key);
    },
    ownKeys(target) {
      use.copied.add(path);
      const keys = Reflect.ownKeys(target);
      keys.forEach((key) => enumerating.add(key));
      // The reads that follow an enumeration in the same turn are the copy.
      queueMicrotask(() => enumerating.clear());
      return keys;
    },
  });
  tracked.set(proxy, { path, use });
  return proxy as T;
};

/**
 * Records the tracked values a handler's result holds as they were, e.g. a response body it
 * returned, or a list it put in a new object.
 */
export const markReturned = (result: unknown, seen = new Set<object>(), depth = 0): void => {
  if (!isJsonContainer(result) || depth > 10 || seen.has(result)) {
    return;
  }
  seen.add(result);
  const entry = tracked.get(result);
  if (entry) {
    entry.use.returned.add(entry.path);
    return;
  }
  for (const item of Array.isArray(result) ? result : Object.values(result)) {
    markReturned(item, seen, depth + 1);
  }
};
