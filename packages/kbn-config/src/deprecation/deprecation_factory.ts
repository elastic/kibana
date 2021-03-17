/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { set } from '@elastic/safer-lodash-set';
import { unset } from '@kbn/std';
import { ConfigDeprecation, ConfigDeprecationHook, ConfigDeprecationFactory } from './types';

const _rename = (
  config: Record<string, any>,
  rootPath: string,
  configDeprecationHook: ConfigDeprecationHook,
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

    configDeprecationHook({
      silent,
      message: `"${fullOldPath}" is deprecated and has been replaced by "${fullNewPath}"`,
      correctionActions: {
        manualSteps: [`Replace "${fullOldPath}" in the kibana.yml file with "${fullNewPath}"`],
      },
    });
  } else {
    configDeprecationHook({
      silent,
      message: `"${fullOldPath}" is deprecated and has been replaced by "${fullNewPath}". However both key are present, ignoring "${fullOldPath}"`,
      correctionActions: {
        manualSteps: [
          `Make sure "${fullNewPath}" contains the correct value in the kibana.yml file."`,
          `Remove "${fullOldPath}" from the kibana.yml file."`,
        ],
      },
    });
  }

  return config;
};

const _unused = (
  config: Record<string, any>,
  rootPath: string,
  configDeprecationHook: ConfigDeprecationHook,
  unusedKey: string
) => {
  const fullPath = getPath(rootPath, unusedKey);
  if (get(config, fullPath) === undefined) {
    return config;
  }
  unset(config, fullPath);
  configDeprecationHook({
    message: `${fullPath} is deprecated and is no longer used`,
    correctionActions: {
      manualSteps: [`Remove "${fullPath}" from the kibana.yml file."`],
    },
  });
  return config;
};

const rename = (oldKey: string, newKey: string): ConfigDeprecation => (
  config,
  rootPath,
  configDeprecationHook
) => _rename(config, rootPath, configDeprecationHook, oldKey, newKey);

const renameFromRoot = (oldKey: string, newKey: string, silent?: boolean): ConfigDeprecation => (
  config,
  rootPath,
  configDeprecationHook
) => _rename(config, '', configDeprecationHook, oldKey, newKey, silent);

const unused = (unusedKey: string): ConfigDeprecation => (
  config,
  rootPath,
  configDeprecationHook
) => _unused(config, rootPath, configDeprecationHook, unusedKey);

const unusedFromRoot = (unusedKey: string): ConfigDeprecation => (
  config,
  rootPath,
  configDeprecationHook
) => _unused(config, '', configDeprecationHook, unusedKey);

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
