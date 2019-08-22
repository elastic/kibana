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

import { VisType } from '../vis';

export interface VisTypesPluginContract {
  register: (visType: VisType) => VisTypesPluginContract;
  get: (name: string) => VisType | undefined;
  getAll: () => VisType[];
}

const visTypes: Map<string, VisType> = new Map();

export const VisTypesRegistryProvider = {
  register: (obj: VisType) => {
    visTypes.set(obj.name, obj);
    return VisTypesRegistryProvider;
  },
  get: (key: string) => visTypes.get(key),
  getAll: () => [...visTypes.values()],
};
