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
  /** Fields of the JSON request bodies the handler sent, and query parameters as `?name`. */
  readonly sent: Set<string>;
  /**
   * GraphQL only: the fields the query selects, by name from the root field, without list
   * elements; a GraphQL response has nothing else.
   */
  readonly selected: Set<string>;
  /**
   * GraphQL only: the fields the query selects under another name, as `alias path=field name`,
   * the path being the response keys from the root field, so what a handler reads under an alias
   * can be traced to the field.
   */
  readonly aliased: Set<string>;
  /**
   * GraphQL only: the enum values and other strings sent as arguments, as `argument path=value`,
   * the path as in `sent`. The schema says which of them are enum values.
   */
  readonly values: Set<string>;
  /**
   * GraphQL only: each time the query selects a field, the arguments it sent to it, as
   * `field path(argument,argument)`, with the root field at the path `''`. A field selected
   * twice, or in several queries, is there once for each different set.
   */
  readonly occurrences: Set<string>;
}

export const createFieldUse = (): FieldUse => ({
  read: new Set(),
  copied: new Set(),
  returned: new Set(),
  sent: new Set(),
  selected: new Set(),
  aliased: new Set(),
  values: new Set(),
  occurrences: new Set(),
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

/** Adds the fields of a JSON request body to `sent`, array elements as `items`. */
export const recordSentFields = (body: unknown, use: FieldUse, path = ''): void => {
  if (Array.isArray(body)) {
    if (body.length > 0) {
      use.sent.add(join(path, 'items'));
    }
    body.forEach((item) => recordSentFields(item, use, join(path, 'items')));
    return;
  }
  if (typeof body !== 'object' || body === null) {
    return;
  }
  for (const [key, value] of Object.entries(body)) {
    use.sent.add(join(path, key));
    recordSentFields(value, use, join(path, key));
  }
};

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
  // An enumeration of the object. A spread, `JSON.stringify` or `Object.entries` goes on to read
  // its enumerable keys in order, which copies the object; `Object.keys` reads none. So reads of
  // the next key in order are held as the copy's, and become reads if the turn ends before it does.
  let enumeration: { keys: string[]; next: number; held: string[] } | undefined;
  const endEnumeration = () => {
    enumeration?.held.forEach((field) => use.read.add(field));
    enumeration = undefined;
  };
  const isField = (target: object, key: string): boolean =>
    isArray ? /^\d+$/.test(key) : Object.hasOwn(target, key) || !(key in Object.prototype);

  const proxy = new Proxy(value, {
    get(target, key, receiver) {
      const result = Reflect.get(target, key, receiver);
      const copy = enumeration?.keys[enumeration.next] === key ? enumeration : undefined;
      if (copy) {
        copy.next += 1;
        // A copy that read every key is done, and its held reads were the copy's.
        if (copy.next === copy.keys.length) {
          enumeration = undefined;
        }
      }
      if (typeof key === 'symbol' || NOT_FIELDS.has(key) || !isField(target, key)) {
        return result;
      }
      const field = isArray ? join(path, 'items') : join(path, key);
      if (copy) {
        copy.held.push(field);
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
      endEnumeration();
      const keys = Reflect.ownKeys(target);
      const current = {
        keys: keys.filter(
          (key): key is string =>
            typeof key === 'string' &&
            Object.getOwnPropertyDescriptor(target, key)?.enumerable === true
        ),
        next: 0,
        held: [],
      };
      enumeration = current.keys.length > 0 ? current : undefined;
      queueMicrotask(() => {
        if (enumeration === current) {
          endEnumeration();
        }
      });
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
