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

import { IRegistry } from './types';

export const createRegistry = <T>(): IRegistry<T> => {
  let data = new Map<string, T>();

  const get = (id: string) => data.get(id);
  const set = (id: string, obj: T) => {
    data.set(id, obj);
  };
  const reset = () => {
    data = new Map<string, T>();
  };
  const length = () => data.size;

  const getAll = () => Array.from(data.values());

  return {
    get,
    set,
    reset,
    length,
    getAll,
  };
};
