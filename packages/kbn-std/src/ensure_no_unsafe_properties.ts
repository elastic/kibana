/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

interface StackItem {
  value: any;
  previousKey: string | null;
}

// we have to do Object.prototype.hasOwnProperty because when you create an object using
// Object.create(null), and I assume other methods, you get an object without a prototype,
// so you can't use current.hasOwnProperty
const hasOwnProperty = (obj: any, property: string) =>
  Object.prototype.hasOwnProperty.call(obj, property);

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

    if (hasOwnProperty(value, '__proto__')) {
      throw new Error(`'__proto__' is an invalid key`);
    }

    if (hasOwnProperty(value, 'prototype') && previousKey === 'constructor') {
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
