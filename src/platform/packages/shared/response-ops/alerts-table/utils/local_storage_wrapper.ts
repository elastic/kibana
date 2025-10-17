/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IStorage, IStorageWrapper } from '@kbn/kibana-utils-plugin/public';

export class LocalStorageWrapper implements IStorageWrapper {
  public store: IStorage;

  constructor(store: IStorage) {
    this.store = store;
  }

  public get = <T>(key: string) => {
    if (!this.store) {
      return null;
    }

    return this.store.getItem(key) as T;
  };

  public set = <T>(key: string, value: T) => {
    return this.store.setItem(key, value);
  };

  public remove = (key: string) => {
    return this.store.removeItem(key);
  };

  public clear = () => {
    return this.store.clear();
  };
}
