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

import { Registry, RegistryReadOnly } from './types';

export const freeze = <T>(registry: Registry<T> | RegistryReadOnly<T>): RegistryReadOnly<T> => ({
  [Symbol.iterator]: registry[Symbol.iterator],
  ids: registry.ids,
  records: registry.records,
  get: registry.get,
  size: registry.size,
  filter: registry.filter,
  filterBy: registry.filterBy,
  find: registry.find,
  findBy: registry.findBy,
});
