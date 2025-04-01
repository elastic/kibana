/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const FORBIDDEN_PATTERNS = ['__proto__', 'constructor.prototype'];
const separator = '.';

/**
 * Recursively traverses through the object's properties and expands ones with
 * dot-separated names into nested objects (eg. { a.b: 'c'} -> { a: { b: 'c' }).
 * @param obj Object to traverse through.
 * @param path The current path of the traversal
 * @returns Same object instance with expanded properties.
 */
export function ensureDeepObject(obj: any, path: string[] = []): any {
  ensureValidObjectPath(path);

  if (obj == null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item, index) => ensureDeepObject(item, [...path, `${index}`]));
  }

  return Object.keys(obj).reduce((fullObject, propertyKey) => {
    const propertyValue = obj[propertyKey];
    const propertySplits = propertyKey.split(separator);
    if (propertySplits.length === 1) {
      fullObject[propertyKey] = ensureDeepObject(propertyValue, [...path, propertyKey]);
    } else {
      walk(fullObject, propertySplits, propertyValue, path);
    }

    return fullObject;
  }, {} as any);
}

function walk(obj: any, keys: string[], value: any, path: string[]) {
  ensureValidObjectPath([...path, ...keys]);

  const key = keys.shift()!;
  if (keys.length === 0) {
    obj[key] = value;
    return;
  }

  if (!Object.hasOwn(obj, key)) {
    obj[key] = {};
  }

  walk(obj[key], keys, ensureDeepObject(value, [...path, key, ...keys]), [...path, key]);
}

export const ensureValidObjectPath = (path: string[]) => {
  const flat = path.join('.');
  FORBIDDEN_PATTERNS.forEach((pattern) => {
    if (flat.includes(pattern)) {
      throw new Error(`Forbidden path detected: ${flat}`);
    }
  });
};
