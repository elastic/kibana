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

import { EmbeddableFactoryRegistry } from '../types';
import { EmbeddableFactory, GetEmbeddableFactories } from '../lib';

export interface EmbeddableApi {
  getEmbeddableFactory: (embeddableFactoryId: string) => EmbeddableFactory;
  getEmbeddableFactories: GetEmbeddableFactories;
  // TODO: Make `registerEmbeddableFactory` receive only `factory` argument.
  registerEmbeddableFactory: (id: string, factory: EmbeddableFactory) => void;
}

export interface EmbeddableDependencies {
  embeddableFactories: EmbeddableFactoryRegistry;
}

export interface EmbeddableDependenciesInternal extends EmbeddableDependencies {
  api: Readonly<Partial<EmbeddableApi>>;
}

export type EmbeddableApiPure = {
  [K in keyof EmbeddableApi]: (deps: EmbeddableDependenciesInternal) => EmbeddableApi[K];
};
