/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep, isEqual, take } from 'lodash';
import * as Rx from 'rxjs';
import { map } from 'rxjs';

interface PersistedLogOptions<T = any> {
  maxLength: number | string;
  isEqual?: (oldItem: T, newItem: T) => boolean;
}

export class PersistedLog<T = any> {
  private name: string;
  private maxLength: number;
  private isEqual: (oldItem: T, newItem: T) => boolean;
  private storage: Storage;

  private items$: Rx.BehaviorSubject<T[]>;

  constructor(name: string, options: PersistedLogOptions<T>, storage = localStorage) {
    this.name = name;
    this.maxLength =
      typeof options.maxLength === 'string'
        ? (this.maxLength = parseInt(options.maxLength, 10))
        : options.maxLength;
    this.isEqual = options.isEqual || isEqual;
    this.storage = storage;
    this.items$ = new Rx.BehaviorSubject<T[]>(this.loadItems());

    if (this.maxLength !== undefined && !isNaN(this.maxLength)) {
      this.items$.next(take(this.items$.value, this.maxLength));
    }
  }

  public add(val: T) {
    if (val == null) {
      return this.items$.value;
    }

    const nextItems = [
      val,
      // remove any duplicate items
      ...[...this.items$.value].filter((item) => !this.isEqual(item, val)),
    ].slice(0, this.maxLength); // truncate

    // Persist the stack to storage
    this.storage.setItem(this.name, JSON.stringify(nextItems));
    // Notify subscribers
    this.items$.next(nextItems);

    return nextItems;
  }

  public get() {
    return cloneDeep(this.items$.value);
  }

  public get$() {
    return this.items$.pipe(map((items) => cloneDeep(items)));
  }

  private loadItems() {
    try {
      return JSON.parse(this.storage.getItem(this.name) || '[]');
    } catch {
      return [];
    }
  }
}
