/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';

class LocalStorageMock {
  private store: Record<string, unknown>;
  constructor(defaultStore: Record<string, unknown>) {
    this.store = defaultStore;
  }
  clear() {
    this.store = {};
  }
  get(key: string) {
    return this.store[key] || null;
  }
  set(key: string, value: unknown) {
    this.store[key] = value;
  }
  remove(key: string) {
    delete this.store[key];
  }
}

export const createLocalStorageMock = (defaultStore: Record<string, unknown>) =>
  new LocalStorageMock(defaultStore) as unknown as Storage;
