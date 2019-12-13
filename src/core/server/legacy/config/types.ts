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

/**
 * New platform representation of the legacy configuration (KibanaConfig)
 *
 * @internal
 */
export interface LegacyConfig {
  get<T>(key?: string): T;
  has(key: string): boolean;
  set(key: string, value: any): void;
  set(config: Record<string, any>): void;
}

/**
 * Representation of a legacy configuration deprecation factory used for
 * legacy plugin deprecations.
 *
 * @internal
 */
export interface LegacyConfigDeprecationFactory {
  rename(oldKey: string, newKey: string): LegacyConfigDeprecation;
  unused(unusedKey: string): LegacyConfigDeprecation;
}

/**
 * Representation of a legacy configuration deprecation.
 *
 * @internal
 */
export type LegacyConfigDeprecation = (
  settings: Record<string, any>,
  log: (msg: string) => void
) => void;

/**
 * Representation of a legacy configuration deprecation provider.
 *
 * @internal
 */
export type LegacyConfigDeprecationProvider = (
  factory: LegacyConfigDeprecationFactory
) => LegacyConfigDeprecation[] | Promise<LegacyConfigDeprecation[]>;
