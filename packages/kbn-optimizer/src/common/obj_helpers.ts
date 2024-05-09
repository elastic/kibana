/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result: any = {};
  for (const [key, value] of Object.entries(obj as any) as any) {
    if (!keys.includes(key)) {
      result[key] = value;
    }
  }
  return result as Omit<T, K>;
}
