/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { get } from 'lodash';
import { set } from '@elastic/safer-lodash-set';
import { unset } from '@kbn/std';
import { ConfigDeprecation, ConfigDeprecationLogger, ConfigDeprecationFactory } from './types';

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

const _copy = (
  config: Record<string, any>,
  rootPath: string,
  originKey: string,
  destinationKey: string
) => {
  const originPath = getPath(rootPath, originKey);
  const originValue = get(config, originPath);
  if (originValue === undefined) {
    return config;
  }

  const destinationPath = getPath(rootPath, destinationKey);
  const destinationValue = get(config, destinationPath);
  if (destinationValue === undefined) {
    set(config, destinationPath, originValue);
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

export const copyFromRoot = (originKey: string, destinationKey: string): ConfigDeprecation => (
  config,
  rootPath,
  log
) => _copy(config, '', originKey, destinationKey);

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
