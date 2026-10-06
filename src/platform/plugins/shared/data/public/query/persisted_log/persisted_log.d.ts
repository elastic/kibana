/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
interface PersistedLogOptions<T = any> {
  maxLength?: number | string;
  filterDuplicates?: boolean;
  isDuplicate?: (oldItem: T, newItem: T) => boolean;
  enableBrowserTabsSync?: boolean;
}
export declare class PersistedLog<T = any> {
  name: string;
  maxLength?: number;
  filterDuplicates?: boolean;
  isDuplicate: (oldItem: T, newItem: T) => boolean;
  storage: IStorageWrapper;
  items: T[];
  private update$;
  private storageEventListener?;
  private enableBrowserTabsSync;
  private subscriberCount;
  constructor(name: string, options: PersistedLogOptions<T> | undefined, storage: IStorageWrapper);
  /** Keeps browser tabs in sync. */
  private addStorageEventListener;
  private removeStorageEventListener;
  add(val: any): T[];
  get(): T[];
  get$(): Observable<T[]>;
}
export {};
