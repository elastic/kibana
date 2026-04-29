/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

interface StackItem {
  value: any;
  previousKey: string | null;
}

const isObject = (obj: any) => typeof obj === 'object' && obj !== null;

// we're using a stack instead of recursion so we aren't limited by the call stack
export function ensureNoUnsafeProperties(obj: any) {
  if (!isObject(obj)) {
    return;
  }

  const stack: StackItem[] = [
    {
      value: obj,
      previousKey: null,
    },
  ];
  const seen = new WeakSet([obj]);

  while (stack.length > 0) {
    const { value, previousKey } = stack.pop()!;

    if (!isObject(value)) {
      continue;
    }

    if (Object.hasOwn(value, '__proto__')) {
      throw new Error(`'__proto__' is an invalid key`);
    }

    if (Object.hasOwn(value, 'prototype') && previousKey === 'constructor') {
      throw new Error(`'constructor.prototype' is an invalid key`);
    }

    // iterating backwards through an array is reportedly more performant
    const entries = Object.entries(value);
    for (let i = entries.length - 1; i >= 0; --i) {
      const [key, childValue] = entries[i];
      if (isObject(childValue)) {
        if (seen.has(childValue)) {
          throw new Error('circular reference detected');
        }

        seen.add(childValue);
      }

      stack.push({
        value: childValue,
        previousKey: key,
      });
    }
  }
}
