/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type StorageType = 'local' | 'session';

/** Storage helper with key namespacing and JSON serialization */
export class StorageHelper {
  constructor(private readonly keyPrefix: string) {}

  private getKey(key: string): string {
    return `${this.keyPrefix}:${key}`;
  }

  set<T>(key: string, value: T, storageType: StorageType = 'local'): void {
    try {
      const storage = storageType === 'local' ? localStorage : sessionStorage;
      storage.setItem(this.getKey(key), JSON.stringify(value));
    } catch {
      // Ignore storage errors
    }
  }

  get<T>(key: string, storageType: StorageType = 'local'): T | null {
    try {
      const storage = storageType === 'local' ? localStorage : sessionStorage;
      const item = storage.getItem(this.getKey(key));
      if (item) {
        return JSON.parse(item) as T;
      }
    } catch {
      // Ignore storage errors
    }
    return null;
  }
}
