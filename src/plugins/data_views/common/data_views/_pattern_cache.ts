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
  getByHash: (id: string) => DataView | undefined;
  set: (id: string, value: Promise<DataView>) => Promise<DataView>;
  clear: (id: string) => void;
  clearAll: () => void;
}

export function createDataViewCache(): DataViewCache {
  const vals: Map<string, Promise<DataView>> = new Map();
  const valsByHash: Map<string, DataView> = new Map();
  const cache: DataViewCache = {
    get: (id: string) => {
      return vals.get(id);
    },
    getByHash: (hash: string) => {
      return valsByHash.get(hash);
    },
    set: (id: string, prom: Promise<DataView>) => {
      vals.set(id, prom);
      prom
        .then((dv) => {
          valsByHash.set(dv.getSpecHash(), dv);
        })
        .catch(() => {
          // no reason to keep a failed promise
          vals.delete(id);
        });
      return prom;
    },
    clear: (id: string) => {
      const prom = vals.get(id);
      if (prom) {
        vals.delete(id);
        prom
          .then((dv) => {
            if (dv.id === id) {
              valsByHash.delete(dv.getSpecHash());
            }
          })
          .catch(() => {});
      }
    },
    clearAll: () => {
      vals.clear();
      valsByHash.clear();
    },
  };
  return cache;
}
