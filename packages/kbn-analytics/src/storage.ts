/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
