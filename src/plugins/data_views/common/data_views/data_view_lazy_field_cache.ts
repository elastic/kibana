/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewField } from '../fields';

export interface DataViewLazyFieldCache {
  get: (id: string) => DataViewField | undefined;
  set: (id: string, value: DataViewField) => DataViewField;
  clear: (id: string) => void;
  clearAll: () => void;
}

export function createDataViewFieldCache(): DataViewLazyFieldCache {
  const vals: Record<string, DataViewField> = {};
  const cache: DataViewLazyFieldCache = {
    get: (id: string) => {
      return vals[id];
    },
    set: (id: string, prom: DataViewField) => {
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
