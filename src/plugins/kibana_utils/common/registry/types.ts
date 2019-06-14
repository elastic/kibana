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

import { Observable } from 'rxjs';

export type Predicate<T> = (item: T) => boolean;
export type Find<Item, Result = Item | undefined> = (predicate: Predicate<Item>) => Result;
export type FindBy<Item, Result = Item | undefined> = (
  attribute: keyof Item,
  value: Item[keyof Item]
) => Result;

export interface Registry<T extends {}> {
  get: (id: string) => T | undefined;
  set: (id: string, obj: T) => void;
  set$: Observable<T>;
  reset: () => void;
  reset$: Observable<void>;
  find: Find<T>;
  findBy: FindBy<T>;
  filter: Find<T, T[]>;
  filterBy: FindBy<T, T[]>;
}
