/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as Rx from 'rxjs';
interface PersistedLogOptions<T = any> {
  maxLength: number | string;
  isEqual?: (oldItem: T, newItem: T) => boolean;
}
export declare class PersistedLog<T = any> {
  private name;
  private maxLength;
  private isEqual;
  private storage;
  private items$;
  constructor(name: string, options: PersistedLogOptions<T>, storage?: Storage);
  add(val: T): T[];
  removeIf(predicate: (item: T) => boolean): T[];
  get(): T[];
  get$(): Rx.Observable<T[]>;
  private persist;
  private loadItems;
}
export {};
