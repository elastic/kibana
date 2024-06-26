/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  INITIAL_DEFAULT_PAGE_SIZE,
  LOCAL_STORAGE_PREFIX,
  LOCAL_STORAGE_PAGE_SIZE_KEY,
} from './constants';
import { createStorage } from './storage';

export const useEuiTablePersistingPageSize = () => {
  const storage = createStorage({
    engine: window.localStorage,
    prefix: LOCAL_STORAGE_PREFIX,
  });

  const getPersistingPageSize = () => {
    const storedPageSize = storage.get(LOCAL_STORAGE_PAGE_SIZE_KEY);
    return storedPageSize || INITIAL_DEFAULT_PAGE_SIZE;
  };

  const setPersistingPageSize = (pageSize: number) => {
    storage.set(LOCAL_STORAGE_PAGE_SIZE_KEY, pageSize);
  };

  return { getPersistingPageSize, setPersistingPageSize };
};
