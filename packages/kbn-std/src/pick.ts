/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export function pick<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> {
  const acc = Object.create(null) as Pick<T, K>;
  for (const key of keys) {
    // @ts-expect-error node type declaration doesn't know about the method yet
    if (Object.hasOwn(obj, key)) {
      acc[key] = obj[key];
    }
  }
  return acc;
}
