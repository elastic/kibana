/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewListItem } from '@kbn/data-views-plugin/common';

/**
 * Get a boolean value from the cache in localStorage or fetch it from the server
 * It's only stored in the cache if it's true
 */
export const getSWRBoolean = async (
  cacheKey: string,
  valueFn: () => Promise<boolean>
): Promise<boolean> => {
  const storage = localStorage;
  try {
    const cachedValue = cacheKey ? storage.getItem(cacheKey) : null;
    if (cachedValue) {
      valueFn()
        .then((value) => {
          if (value) {
            storage.setItem(cacheKey, '1');
          } else {
            storage.removeItem(cacheKey);
          }
        })
        .catch(() => false);
      return true;
    }
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
  valueFn: () => Promise<DataViewListItem[]>
): Promise<DataViewListItem[]> => {
  const storage = sessionStorage;
  try {
    const cachedValue = cacheKey ? storage.getItem(cacheKey) : null;
    const result = valueFn().then((value) => {
      storage.setItem(cacheKey, JSON.stringify(value));
      return value;
    });
    if (cachedValue) {
      try {
        // catch an invalid JSON
        return JSON.parse(cachedValue);
      } catch (e) {
        // empty
      }
    }
    return result;
  } catch {
    return [];
  }
};
