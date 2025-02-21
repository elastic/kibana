/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewListItem } from '@kbn/data-views-plugin/common';
import type { Storage } from '@kbn/kibana-utils-plugin/public';

/**
 * Get a boolean value from the cache in localStorage or fetch it from the server
 * It's only stored in the cache if it's true
 */
export const getSWRBoolean = async (
  cacheKey: string,
  valueFn: () => Promise<boolean>,
  storage: Storage
): Promise<boolean> => {
  try {
    const cachedValue = cacheKey ? storage.get(cacheKey) : null;

    const result = valueFn()
      .then((value) => {
        if (value) {
          storage.set(cacheKey, '1');
        } else {
          storage.remove(cacheKey);
        }
        return value;
      })
      .catch(() => false);
    if (cachedValue) {
      return Boolean(cachedValue);
    }
    return result;
  } catch {
    // empty
  }
  return valueFn().catch(() => false);
};

/**
 * Returns a DataViewListItem[] from the cache in sessionStorage, fetch it from the server in the background to update the cache
 */
export const getSWRDataViewList = async (
  cacheKey: string,
  valueFn: () => Promise<DataViewListItem[]>,
  storage: Storage
): Promise<DataViewListItem[]> => {
  try {
    const cachedValue = cacheKey ? storage.get(cacheKey) : null;
    const result = valueFn().then((value) => {
      storage.set(cacheKey, value);
      return value;
    });
    if (cachedValue && Array.isArray(cachedValue)) {
      return cachedValue;
    }
    return result;
  } catch {
    return [];
  }
};
