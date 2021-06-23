/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

//
// THIS IS A DIRECT COPY OF
// 'packages/kbn-config/src/raw/ensure_deep_object.ts'
// BECAUSE THAT IS BLOCKED FOR IMPORTING BY OUR LINTER.
//
// IF THAT IS EXPOSED, WE SHOULD USE IT RATHER THAN CLONE IT.
//

/* eslint-disable @typescript-eslint/no-explicit-any */
// ^ Disabling the rule for the entire file because of the complexity to type this

const separator = '.';

/**
 * Recursively traverses through the object's properties and expands ones with
 * dot-separated names into nested objects (eg. { a.b: 'c'} -> { a: { b: 'c' }).
 * @param obj Object to traverse through.
 * @returns Same object instance with expanded properties.
 */
export function ensureDeepObject(obj: any): any {
  if (obj == null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => ensureDeepObject(item));
  }

  return Object.keys(obj).reduce((fullObject, propertyKey) => {
    const propertyValue = obj[propertyKey];
    if (!propertyKey.includes(separator)) {
      fullObject[propertyKey] = ensureDeepObject(propertyValue);
    } else {
      walk(fullObject, propertyKey.split(separator), propertyValue);
    }

    return fullObject;
  }, {} as any);
}

function walk(obj: any, keys: string[], value: any) {
  const key = keys.shift()!;
  if (keys.length === 0) {
    obj[key] = value;
    return;
  }

  if (obj[key] === undefined) {
    obj[key] = {};
  }

  walk(obj[key], keys, ensureDeepObject(value));
}
