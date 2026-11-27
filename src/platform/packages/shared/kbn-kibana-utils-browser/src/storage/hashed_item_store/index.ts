/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HashedItemStore } from './hashed_item_store';
export { HashedItemStore };

// Defer access to the browser global so the package can be imported in a non-browser environment.
const lazySessionStorage: Storage = {
  get length() {
    return window.sessionStorage.length;
  },
  clear: () => window.sessionStorage.clear(),
  getItem: (key) => window.sessionStorage.getItem(key),
  key: (index) => window.sessionStorage.key(index),
  removeItem: (key) => window.sessionStorage.removeItem(key),
  setItem: (key, value) => window.sessionStorage.setItem(key, value),
};

export const hashedItemStore = new HashedItemStore(lazySessionStorage);
