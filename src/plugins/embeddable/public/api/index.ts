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

import {
  EmbeddableApiPure,
  EmbeddableDependencies,
  EmbeddableApi,
  EmbeddableDependenciesInternal,
} from './types';
import { getEmbeddableFactories } from './get_embeddable_factories';
import { getEmbeddableFactory } from './get_embeddable_factory';
import { registerEmbeddableFactory } from './register_embeddable_factory';

export * from './types';

export const pureApi: EmbeddableApiPure = {
  getEmbeddableFactories,
  getEmbeddableFactory,
  registerEmbeddableFactory,
};

export const createApi = (deps: EmbeddableDependencies) => {
  const partialApi: Partial<EmbeddableApi> = {};
  const depsInternal: EmbeddableDependenciesInternal = { ...deps, api: partialApi };
  for (const [key, fn] of Object.entries(pureApi)) {
    (partialApi as any)[key] = fn(depsInternal);
  }
  Object.freeze(partialApi);
  const api = partialApi as EmbeddableApi;
  return { api, depsInternal };
};
