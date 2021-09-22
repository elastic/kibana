/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from './data_view';

export interface DataViewCache {
  get: (id: string) => Promise<DataView> | undefined;
  set: (id: string, value: Promise<DataView>) => Promise<DataView>;
  clear: (id: string) => void;
  clearAll: () => void;
}

export function createDataViewCache(): DataViewCache {
  const vals: Record<string, Promise<DataView>> = {};
  const cache: DataViewCache = {
    get: (id: string) => {
      return vals[id];
    },
    set: (id: string, prom: Promise<DataView>) => {
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
