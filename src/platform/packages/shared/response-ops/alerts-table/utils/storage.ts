/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IStorage, IStorageWrapper } from '@kbn/kibana-utils-plugin/public';

export class Storage implements IStorageWrapper {
  public store: IStorage;

  constructor(store: IStorage) {
    this.store = store;
  }

  public get = (key: string) => {
    if (!this.store) {
      return null;
    }

    const storageItem = this.store.getItem(key);
    if (storageItem === null) {
      return null;
    }

    try {
      return JSON.parse(storageItem);
    } catch (error) {
      return null;
    }
  };

  public set = (key: string, value: any, includeUndefined: boolean = false) => {
    const replacer = includeUndefined
      ? (_: string, currentValue: any) =>
          typeof currentValue === 'undefined' ? null : currentValue
      : undefined;
    try {
      return this.store.setItem(key, JSON.stringify(value, replacer));
    } catch (e) {
      return false;
    }
  };

  public remove = (key: string) => {
    return this.store.removeItem(key);
  };

  public clear = () => {
    return this.store.clear();
  };
}
