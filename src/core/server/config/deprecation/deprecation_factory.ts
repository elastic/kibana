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

import { set } from '@elastic/safer-lodash-set';
import { get } from 'lodash';
import { ConfigDeprecation, ConfigDeprecationLogger, ConfigDeprecationFactory } from './types';
import { unset } from '../../../utils';

const _rename = (
  config: Record<string, any>,
  rootPath: string,
  log: ConfigDeprecationLogger,
  oldKey: string,
  newKey: string,
  silent?: boolean
) => {
  const fullOldPath = getPath(rootPath, oldKey);
  const oldValue = get(config, fullOldPath);
  if (oldValue === undefined) {
    return config;
  }

  unset(config, fullOldPath);

  const fullNewPath = getPath(rootPath, newKey);
  const newValue = get(config, fullNewPath);
  if (newValue === undefined) {
    set(config, fullNewPath, oldValue);

    if (!silent) {
      log(`"${fullOldPath}" is deprecated and has been replaced by "${fullNewPath}"`);
    }
  } else {
    if (!silent) {
      log(
        `"${fullOldPath}" is deprecated and has been replaced by "${fullNewPath}". However both key are present, ignoring "${fullOldPath}"`
      );
    }
  }
  return config;
};

const _unused = (
  config: Record<string, any>,
  rootPath: string,
  log: ConfigDeprecationLogger,
  unusedKey: string
) => {
  const fullPath = getPath(rootPath, unusedKey);
  if (get(config, fullPath) === undefined) {
    return config;
  }
  unset(config, fullPath);
  log(`${fullPath} is deprecated and is no longer used`);
  return config;
};

const rename = (oldKey: string, newKey: string): ConfigDeprecation => (config, rootPath, log) =>
  _rename(config, rootPath, log, oldKey, newKey);

const renameFromRoot = (oldKey: string, newKey: string, silent?: boolean): ConfigDeprecation => (
  config,
  rootPath,
  log
) => _rename(config, '', log, oldKey, newKey, silent);

const unused = (unusedKey: string): ConfigDeprecation => (config, rootPath, log) =>
  _unused(config, rootPath, log, unusedKey);

const unusedFromRoot = (unusedKey: string): ConfigDeprecation => (config, rootPath, log) =>
  _unused(config, '', log, unusedKey);

const getPath = (rootPath: string, subPath: string) =>
  rootPath !== '' ? `${rootPath}.${subPath}` : subPath;

/**
 * The actual platform implementation of {@link ConfigDeprecationFactory}
 *
 * @internal
 */
export const configDeprecationFactory: ConfigDeprecationFactory = {
  rename,
  renameFromRoot,
  unused,
  unusedFromRoot,
};
