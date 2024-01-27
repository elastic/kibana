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
  set: (dataView: DataView) => Promise<DataView>;
  clear: (id: string) => void;
  clearAll: () => void;
}

export function createDataViewCache(): DataViewCache {
  const vals: Map<string, DataView> = new Map();
  const valsByHash: Map<string, DataView> = new Map();
  const cache: DataViewCache = {
    get: (id: string) => {
      const dataView = vals.get(id);
      if (!dataView) return undefined;
      return Promise.resolve(dataView);
    },
    getByHash: (hash: string) => {
      return valsByHash.get(hash);
    },
    set: (dataView: DataView) => {
      const id = dataView.id!;
      vals.set(id, dataView);
      valsByHash.set(dataView.getSpecHash(), dataView);
      return Promise.resolve(dataView);
    },
    clear: (id: string) => {
      const dataView = vals.get(id);
      if (dataView) {
        vals.delete(id);
        valsByHash.delete(dataView.getSpecHash());
      }
    },
    clearAll: () => {
      vals.clear();
      valsByHash.clear();
    },
  };
  return cache;
}
