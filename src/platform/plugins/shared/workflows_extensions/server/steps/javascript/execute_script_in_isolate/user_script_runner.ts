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
// Sanitize the returned value in-isolate, before the structured-clone copy-out,
// for two reasons:
//   1. Prototype-pollution prevention: strips own keys named __proto__, constructor,
//      or prototype so a downstream deep-merge or path-assign cannot pollute
//      Object.prototype on the host. Built-in method references (Set/WeakSet) are
//      captured before user code runs so user overrides (e.g. Set.prototype.has = ...)
//      cannot defeat the filter. Non-plain objects (class instances) are also scanned
//      for forbidden own keys and rebuilt as plain objects when found, because V8's
//      structured-clone strips the prototype but preserves own data properties.
//   2. Cycle detection: tracks the ancestor chain of the current DFS path (not all
//      visited nodes) and throws early when an object appears in its own ancestry.
//      V8's value serializer (used by the copy-out) cannot handle circular references
//      at all; throwing here gives a clear error instead of a cryptic serializer
//      failure. Diamond-shaped graphs (the same object reachable via two paths but
//      forming no cycle) are allowed.
// Non-plain built-ins (Date, Map, etc.) pass through unchanged when they carry no
// forbidden own keys; the copy-out preserves their type. A returned Promise still
// fails the copy-out (async scripts remain unsupported).
const USER_SCRIPT_RUNNER = `
  const _setHas = Set.prototype.has;
  const _weakSetHas = WeakSet.prototype.has;
  const _weakSetAdd = WeakSet.prototype.add;
  const _weakSetDelete = WeakSet.prototype.delete;
  const _isArray = Array.isArray;
  const _objectKeys = Object.keys;
  const _getProto = Object.getPrototypeOf;
  const _objectProto = Object.prototype;

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
      const result = value.map((v) => sanitize(v, ancestors));
      _weakSetDelete.call(ancestors, value);
      return result;
    }
    const keys = _objectKeys(value);
    if (!isPlainObject(value) && !keys.some((k) => _setHas.call(FORBIDDEN_KEYS, k))) {
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
  return sanitize(functionResult, new WeakSet());
`;

export const runUserScript = (
  ivmContext: ivm.Context,
  script: string,
  executionTimeoutMs: number
): Promise<unknown> =>
  ivmContext.evalClosure(USER_SCRIPT_RUNNER, [script], {
    arguments: { copy: true },
    result: { copy: true },
    timeout: executionTimeoutMs,
  });
