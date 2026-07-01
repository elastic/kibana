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
// so a user script cannot smuggle a prototype-pollution payload (own keys named
// __proto__ / constructor / prototype) into the host where a downstream
// deep-merge or path-assign could pollute Object.prototype. Only plain objects
// and arrays are rebuilt; other built-ins (Date, Map, etc.) are left untouched
// so the copy-out preserves their type, and a returned Promise still fails the
// copy-out (async scripts remain unsupported).
const USER_SCRIPT_RUNNER = `
  const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
  const isPlainObject = (value) => {
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  };
  const sanitize = (value) => {
    if (Array.isArray(value)) return value.map(sanitize);
    if (value === null || typeof value !== 'object' || !isPlainObject(value)) return value;
    const clean = {};
    for (const key of Object.keys(value)) {
      if (FORBIDDEN_KEYS.has(key)) continue;
      clean[key] = sanitize(value[key]);
    }
    return clean;
  };
  const functionResult = new Function($0)();
  return sanitize(functionResult);
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
