/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Report } from './report';

export interface Storage<T = any, S = void> {
  get: (key: string) => T | null;
  set: (key: string, value: T) => S;
  remove: (key: string) => T | null;
  clear: () => void;
}

export class ReportStorageManager {
  storageKey: string;
  private storage?: Storage;
  constructor(storageKey: string, storage?: Storage) {
    this.storageKey = storageKey;
    this.storage = storage;
  }
  public get(): Report | undefined {
    if (!this.storage) return;
    return this.storage.get(this.storageKey);
  }
  public store(report: Report) {
    if (!this.storage) return;
    this.storage.set(this.storageKey, report);
  }
}
