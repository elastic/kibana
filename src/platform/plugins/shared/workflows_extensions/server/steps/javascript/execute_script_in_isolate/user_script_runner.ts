/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type ivm from 'isolated-vm';

// User scripts run as synchronous code only. Async constructs are intentionally
// unsupported: top-level `await` throws a SyntaxError, and returning a Promise
// fails the structured-clone copy-out. Keeping execution synchronous means the
// in-isolate CPU `timeout` fully bounds every script (no suspended-promise hangs).
// Three layers defend against prototype-pollution:
//   1. Prototype sealing: key prototypes are sealed (Object.seal) before user code
//      runs, preventing user code from adding new poisoned properties to them (e.g.
//      `Object.prototype.isAdmin = true`). This mirrors the same hardening Kibana
//      applies on the host process at startup.
//   2. Captured built-in references: all built-in method references the sanitizer
//      relies on are captured before user code runs so that even overwriting an
//      existing prototype method (seal does not block writes to writable properties)
//      cannot defeat the sanitizer.
//   3. Return-value sanitization: strips own keys named __proto__, constructor, or
//      prototype from any returned object so a downstream deep-merge or path-assign
//      cannot pollute Object.prototype on the host. Non-plain objects (class
//      instances) are also scanned and rebuilt as plain objects when they carry
//      forbidden own keys, because V8's structured-clone strips the prototype but
//      preserves own data properties.
// Cycle detection: tracks the ancestor chain of the current DFS path (not all
// visited nodes) and throws early when an object appears in its own ancestry.
// V8's value serializer (used by the copy-out) cannot handle circular references
// at all; throwing here gives a clear error instead of a cryptic serializer
// failure. Diamond-shaped graphs (the same object reachable via two paths but
// forming no cycle) are allowed.
// Non-plain built-ins (Date, Map, etc.) pass through unchanged when they carry no
// forbidden own keys; the copy-out preserves their type. A returned Promise still
// fails the copy-out (async scripts remain unsupported).
const USER_SCRIPT_RUNNER = `
  const _setHas = Set.prototype.has;
  const _weakSetHas = WeakSet.prototype.has;
  const _weakSetAdd = WeakSet.prototype.add;
  const _weakSetDelete = WeakSet.prototype.delete;
  const _isArray = Array.isArray;
  const _arrayMap = Array.prototype.map;
  const _arraySome = Array.prototype.some;
  const _objectKeys = Object.keys;
  const _getProto = Object.getPrototypeOf;
  const _objectProto = Object.prototype;

  Object.seal(Object.prototype);
  Object.seal(Number.prototype);
  Object.seal(String.prototype);
  Object.seal(Function.prototype);
  Object.seal(Array.prototype);
  Object.seal(Set.prototype);
  Object.seal(WeakSet.prototype);
  Object.seal(Map.prototype);
  Object.seal(WeakMap.prototype);

  const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
  const isPlainObject = (value) => {
    const proto = _getProto(value);
    return proto === _objectProto || proto === null;
  };
  const sanitize = (value, ancestors) => {
    if (value === null || typeof value !== 'object') return value;
    if (_weakSetHas.call(ancestors, value)) throw new Error('Script returned a value containing a circular reference');
    _weakSetAdd.call(ancestors, value);
    if (_isArray(value)) {
      const result = _arrayMap.call(value, (v) => sanitize(v, ancestors));
      _weakSetDelete.call(ancestors, value);
      return result;
    }
    const keys = _objectKeys(value);
    if (!isPlainObject(value) && !_arraySome.call(keys, (k) => _setHas.call(FORBIDDEN_KEYS, k))) {
      for (let i = 0; i < keys.length; i++) {
        value[keys[i]] = sanitize(value[keys[i]], ancestors);
      }
      _weakSetDelete.call(ancestors, value);
      return value;
    }
    const clean = {};
    for (const key of keys) {
      if (_setHas.call(FORBIDDEN_KEYS, key)) continue;
      clean[key] = sanitize(value[key], ancestors);
    }
    _weakSetDelete.call(ancestors, value);
    return clean;
  };
  const functionResult = new Function($0)();
  // Reject Promise returns explicitly: with JSON serialization a Promise would silently
  // become {} instead of failing at copy-out as it did before this change.
  if (functionResult instanceof Promise) {
    throw new Error('Script returned a Promise. Only synchronous code is supported.');
  }
  // Serialize inside the guest so the copy-out is a flat string bounded by memoryLimit.
  // JSON.stringify(undefined) returns undefined, not a string; ?? 'null' normalizes that.
  return JSON.stringify(sanitize(functionResult, new WeakSet())) ?? 'null';
`;

export const runUserScript = async (
  ivmContext: ivm.Context,
  script: string,
  executionTimeoutMs: number,
  maxOutputChars: number
): Promise<unknown> => {
  const jsonStr = await ivmContext.evalClosure(USER_SCRIPT_RUNNER, [script], {
    arguments: { copy: true },
    result: { copy: true },
    timeout: executionTimeoutMs,
  });

  if (typeof jsonStr !== 'string') {
    throw new Error('Script returned a non-serializable value');
  }

  if (jsonStr.length > maxOutputChars) {
    throw new Error(
      `Script output exceeded the size limit of ${Math.round(maxOutputChars / 1024 / 1024)} MB`
    );
  }

  return JSON.parse(jsonStr);
};
