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

import { ConfigDeprecation, ConfigDeprecationProvider } from '../../config/deprecation';
import { LegacyConfigDeprecation, LegacyConfigDeprecationProvider } from './index';
import { configDeprecationFactory } from '../../config/deprecation/deprecation_factory';

const convertLegacyDeprecation = (
  legacyDeprecation: LegacyConfigDeprecation
): ConfigDeprecation => (config, fromPath, logger) => {
  legacyDeprecation(config, logger);
  return config;
};

const legacyUnused = (unusedKey: string): LegacyConfigDeprecation => (settings, log) => {
  const deprecation = configDeprecationFactory.unusedFromRoot(unusedKey);
  deprecation(settings, '', log);
};

const legacyRename = (oldKey: string, newKey: string): LegacyConfigDeprecation => (
  settings,
  log
) => {
  const deprecation = configDeprecationFactory.renameFromRoot(oldKey, newKey);
  deprecation(settings, '', log);
};

/**
 * Async deprecation provider converter for legacy deprecation implementation
 *
 * @internal
 */
export const convertLegacyDeprecationProvider = async (
  legacyProvider: LegacyConfigDeprecationProvider
): Promise<ConfigDeprecationProvider> => {
  const legacyDeprecations = await legacyProvider({
    rename: legacyRename,
    unused: legacyUnused,
  });
  return () => legacyDeprecations.map(convertLegacyDeprecation);
};
