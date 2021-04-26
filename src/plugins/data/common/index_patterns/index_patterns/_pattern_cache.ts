/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface PatternCache<T> {
  get: (id: string) => Promise<T> | undefined;
  set: (id: string, value: Promise<T>) => Promise<T>;
  clear: (id: string) => void;
  clearAll: () => void;
}

export function createIndexPatternCache<T>(): PatternCache<T> {
  const vals: Record<string, any> = {};
  const cache: PatternCache<T> = {
    get: (id: string) => {
      return vals[id];
    },
    set: (id: string, prom: any) => {
      vals[id] = prom;
      return prom;
    },
    clear: (id: string) => {
      delete vals[id];
    },
    clearAll: () => {
      for (const id in vals) {
        if (vals.hasOwnProperty(id)) {
          delete vals[id];
        }
      }
    },
  };
  return cache;
}
