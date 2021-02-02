/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IndexPattern } from './index_pattern';

export interface PatternCache {
  get: (id: string) => Promise<IndexPattern> | undefined;
  set: (id: string, value: Promise<IndexPattern>) => Promise<IndexPattern>;
  clear: (id: string) => void;
  clearAll: () => void;
}

export function createIndexPatternCache(): PatternCache {
  const vals: Record<string, any> = {};
  const cache: PatternCache = {
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
