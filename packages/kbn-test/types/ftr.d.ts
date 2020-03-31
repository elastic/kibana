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
import {
  Config,
  Lifecycle,
  FailureMetadata,
  DockerServersService,
} from '../src/functional_test_runner/lib';

export { Lifecycle, Config, FailureMetadata };

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
 * Covert a Provider type to the instance type it provides
 */
export type ProvidedType<T extends (...args: any[]) => any> = MaybeAsyncInstance<ReturnType<T>>;

/**
 * Convert a map of providers to a map of the instance types they provide, also converting
 * promise types into the async instances that other providers will receive.
 */
type ProvidedTypeMap<T extends {}> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? ProvidedType<T[K]> : unknown;
};

export interface GenericFtrProviderContext<
  ServiceProviders extends {},
  PageObjectProviders extends {},
  ServiceMap = ProvidedTypeMap<ServiceProviders>,
  PageObjectMap = ProvidedTypeMap<PageObjectProviders>
> {
  /**
   * Determine if a service is avaliable
   * @param serviceName
   */
  hasService(
    serviceName: 'config' | 'log' | 'lifecycle' | 'failureMetadata' | 'dockerServers'
  ): true;
  hasService<K extends keyof ServiceMap>(serviceName: K): serviceName is K;
  hasService(serviceName: string): serviceName is Extract<keyof ServiceMap, string>;

  /**
   * Get the instance of a service, if the service is loaded async and the service needs to be used
   * outside of a test/hook, then make sure to call its `.init()` method and await it's promise.
   * @param serviceName
   */
  getService(serviceName: 'config'): Config;
  getService(serviceName: 'log'): ToolingLog;
  getService(serviceName: 'lifecycle'): Lifecycle;
  getService(serviceName: 'dockerServers'): DockerServersService;
  getService(serviceName: 'failureMetadata'): FailureMetadata;
  getService<T extends keyof ServiceMap>(serviceName: T): ServiceMap[T];

  /**
   * Get a map of PageObjects
   * @param pageObjects
   */
  getPageObjects<K extends keyof PageObjectMap>(pageObjects: K[]): Pick<PageObjectMap, K>;

  /**
   * Synchronously load a test file, can be called within a `describe()` block to add
   * common setup/teardown steps to several suites
   * @param path
   */
  loadTestFile(path: string): void;
}

export interface FtrConfigProviderContext {
  log: ToolingLog;
  readConfigFile(path: string): Promise<Config>;
}
