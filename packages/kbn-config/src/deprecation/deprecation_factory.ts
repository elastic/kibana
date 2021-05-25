/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import {
  ConfigDeprecation,
  AddConfigDeprecation,
  ConfigDeprecationFactory,
  DeprecatedConfigDetails,
  ConfigDeprecationCommand,
} from './types';

const _rename = (
  config: Record<string, any>,
  rootPath: string,
  addDeprecation: AddConfigDeprecation,
  oldKey: string,
  newKey: string,
  details?: Partial<DeprecatedConfigDetails>
): void | ConfigDeprecationCommand => {
  const fullOldPath = getPath(rootPath, oldKey);
  const oldValue = get(config, fullOldPath);
  if (oldValue === undefined) {
    return;
  }

  const fullNewPath = getPath(rootPath, newKey);
  const newValue = get(config, fullNewPath);
  if (newValue === undefined) {
    addDeprecation({
      message: `"${fullOldPath}" is deprecated and has been replaced by "${fullNewPath}"`,
      correctiveActions: {
        manualSteps: [
          `Replace "${fullOldPath}" with "${fullNewPath}" in the Kibana config file, CLI flag, or environment variable (in Docker only).`,
        ],
      },
      ...details,
    });
    return {
      set: [{ path: fullNewPath, value: oldValue }],
      unset: [{ path: fullOldPath }],
    };
  } else {
    addDeprecation({
      message: `"${fullOldPath}" is deprecated and has been replaced by "${fullNewPath}". However both key are present, ignoring "${fullOldPath}"`,
      correctiveActions: {
        manualSteps: [
          `Make sure "${fullNewPath}" contains the correct value in the config file, CLI flag, or environment variable (in Docker only).`,
          `Remove "${fullOldPath}" from the config.`,
        ],
      },
      ...details,
    });
  }

  return {
    unset: [{ path: fullOldPath }],
  };
};

const _unused = (
  config: Record<string, any>,
  rootPath: string,
  addDeprecation: AddConfigDeprecation,
  unusedKey: string,
  details?: Partial<DeprecatedConfigDetails>
): void | ConfigDeprecationCommand => {
  const fullPath = getPath(rootPath, unusedKey);
  if (get(config, fullPath) === undefined) {
    return;
  }
  addDeprecation({
    message: `${fullPath} is deprecated and is no longer used`,
    correctiveActions: {
      manualSteps: [
        `Remove "${fullPath}" from the Kibana config file, CLI flag, or environment variable (in Docker only)`,
      ],
    },
    ...details,
  });
  return {
    unset: [{ path: fullPath }],
  };
};

const rename = (
  oldKey: string,
  newKey: string,
  details?: Partial<DeprecatedConfigDetails>
): ConfigDeprecation => (config, rootPath, addDeprecation) =>
  _rename(config, rootPath, addDeprecation, oldKey, newKey, details);

const renameFromRoot = (
  oldKey: string,
  newKey: string,
  details?: Partial<DeprecatedConfigDetails>
): ConfigDeprecation => (config, rootPath, addDeprecation) =>
  _rename(config, '', addDeprecation, oldKey, newKey, details);

const unused = (
  unusedKey: string,
  details?: Partial<DeprecatedConfigDetails>
): ConfigDeprecation => (config, rootPath, addDeprecation) =>
  _unused(config, rootPath, addDeprecation, unusedKey, details);

const unusedFromRoot = (
  unusedKey: string,
  details?: Partial<DeprecatedConfigDetails>
): ConfigDeprecation => (config, rootPath, addDeprecation) =>
  _unused(config, '', addDeprecation, unusedKey, details);

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
