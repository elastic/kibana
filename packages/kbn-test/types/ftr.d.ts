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

import { ToolingLog } from '@kbn/dev-utils';
import { DefaultServiceProviders } from '../../../src/functional_test_runner/types';

type Provider = (ctx: GenericFtrProviderContext<any, any>) => any;
type ProviderMap = Record<string, Provider>;

interface AsyncInstance<T> {
  /**
   * Services that are initialized async are not ready before the tests execute, so you might need
   * to call `init()` and await the promise it returns before interacting with the service
   */
  init(): Promise<T>;
}

/**
 * When a provider returns a promise it is initialized as an AsyncInstance that is a
 * proxy to the eventual result with an added init() method which returns the eventual
 * result. Automatically unwrap these promises and convert them to AsyncInstances + Instance
 * types.
 */
type MaybeAsyncInstance<T> = T extends Promise<infer X> ? AsyncInstance<X> & X : T;

/**
 * Convert a map of providers to
 */
type ProvidedTypeMap<T extends ProviderMap> = {
  [K in keyof T]: MaybeAsyncInstance<ReturnType<T[K]>>
};

// helper to extract value type in array of strings
type ValuesOf<T extends string[]> = T extends Array<infer X> ? X : unknown;

export interface GenericFtrProviderContext<
  ServiceProviders extends ProviderMap,
  PageObjectProviders extends ProviderMap,
  ServiceMap = ProvidedTypeMap<ServiceProviders & DefaultServiceProviders>,
  PageObjectMap = ProvidedTypeMap<PageObjectProviders>
> {
  hasService(serviceName: string): boolean;

  getService<T extends keyof ServiceMap>(serviceName: T): ServiceMap[T];

  getPageObjects<T extends Array<keyof PageObjectMap>>(
    pageObjectNames: T
  ): { [K in ValuesOf<T>]: PageObjectMap[K] };

  loadTestFile(path: string): void;
}
