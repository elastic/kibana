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

import _ from 'lodash';
import * as Rx from 'rxjs';
import { map } from 'rxjs/operators';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';

const defaultIsDuplicate = (oldItem: any, newItem: any) => {
  return _.isEqual(oldItem, newItem);
};

interface PersistedLogOptions<T = any> {
  maxLength?: number | string;
  filterDuplicates?: boolean;
  isDuplicate?: (oldItem: T, newItem: T) => boolean;
}

export class PersistedLog<T = any> {
  public name: string;
  public maxLength?: number;
  public filterDuplicates?: boolean;
  public isDuplicate: (oldItem: T, newItem: T) => boolean;
  public storage: IStorageWrapper;
  public items: T[];

  private update$ = new Rx.BehaviorSubject(undefined);

  constructor(name: string, options: PersistedLogOptions<T> = {}, storage: IStorageWrapper) {
    this.name = name;
    this.maxLength =
      typeof options.maxLength === 'string'
        ? (this.maxLength = parseInt(options.maxLength, 10))
        : options.maxLength;
    this.filterDuplicates = options.filterDuplicates || false;
    this.isDuplicate = options.isDuplicate || defaultIsDuplicate;
    this.storage = storage;
    this.items = this.storage.get(this.name) || [];
    if (this.maxLength !== undefined && !isNaN(this.maxLength)) {
      this.items = _.take(this.items, this.maxLength);
    }
  }

  public add(val: any) {
    if (val == null) {
      return this.items;
    }

    // remove any matching items from the stack if option is set
    if (this.filterDuplicates) {
      _.remove(this.items, item => {
        return this.isDuplicate(item, val);
      });
    }

    this.items.unshift(val);

    // if maxLength is set, truncate the stack
    if (this.maxLength && !isNaN(this.maxLength)) {
      this.items = _.take(this.items, this.maxLength);
    }

    // persist the stack
    this.storage.set(this.name, this.items);
    this.update$.next(undefined);
    return this.items;
  }

  public get() {
    return _.cloneDeep(this.items);
  }

  public get$() {
    return this.update$.pipe(map(() => this.get()));
  }
}
