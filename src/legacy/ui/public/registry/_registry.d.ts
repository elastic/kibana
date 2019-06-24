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

import { IndexedArray, IndexedArrayConfig } from '../indexed_array';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface UIRegistry<T> extends IndexedArray<T> {}

interface UIRegistrySpec<T> extends IndexedArrayConfig<T> {
  name: string;
  filter?(item: T): boolean;
}

/**
 * Creates a new UiRegistry (See js method for detailed documentation)
 * The generic type T is the type of objects which are stored in the registry.
 * The generic type A is an interface of accessors which depend on the
 * fields of the objects stored in the registry.
 * Example: if there is a string field "name" in type T, then A should be
 * `{ byName: { [typeName: string]: T }; }`
 */
declare function uiRegistry<T, A = {}>(
  spec: UIRegistrySpec<T>
): { (): UIRegistry<T> & A; register<T>(privateModule: T): UIRegistry<T> & A };
