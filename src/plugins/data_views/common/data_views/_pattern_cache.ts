/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewLazy } from './data_view_lazy';

export interface DataViewCache {
  get: (id: string) => Promise<DataViewLazy> | undefined;
  set: (id: string, value: Promise<DataViewLazy>) => Promise<DataViewLazy>;
  clear: (id: string) => void;
  clearAll: () => void;
}

export function createDataViewCache(): DataViewCache {
  const vals: Record<string, Promise<DataViewLazy>> = {};
  const cache: DataViewCache = {
    get: (id: string) => {
      return vals[id];
    },
    set: (id: string, prom: Promise<DataViewLazy>) => {
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
