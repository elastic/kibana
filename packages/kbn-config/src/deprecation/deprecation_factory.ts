/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';

import {
  ConfigDeprecation,
  AddConfigDeprecation,
  ConfigDeprecationFactory,
  DeprecatedConfigDetails,
  ConfigDeprecationCommand,
} from './types';

const getDeprecationTitle = (deprecationPath: string) => {
  return i18n.translate('kbnConfig.deprecations.deprecatedSettingTitle', {
    defaultMessage: 'Setting "{deprecationPath}" is deprecated',
    values: { deprecationPath },
  });
};

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
      title: getDeprecationTitle(fullOldPath),
      message: i18n.translate('kbnConfig.deprecations.replacedSettingMessage', {
        defaultMessage: `Setting "{fullOldPath}" has been replaced by "{fullNewPath}"`,
        values: { fullOldPath, fullNewPath },
      }),
      correctiveActions: {
        manualSteps: [
          i18n.translate('kbnConfig.deprecations.replacedSetting.manualStepOneMessage', {
            defaultMessage:
              'Replace "{fullOldPath}" with "{fullNewPath}" in the Kibana config file, CLI flag, or environment variable (in Docker only).',
            values: { fullOldPath, fullNewPath },
          }),
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
      title: getDeprecationTitle(fullOldPath),
      message: i18n.translate('kbnConfig.deprecations.conflictSettingMessage', {
        defaultMessage:
          'Setting "${fullOldPath}" has been replaced by "${fullNewPath}". However, both keys are present. Ignoring "${fullOldPath}"',
        values: { fullOldPath, fullNewPath },
      }),
      correctiveActions: {
        manualSteps: [
          i18n.translate('kbnConfig.deprecations.conflictSetting.manualStepOneMessage', {
            defaultMessage:
              'Make sure "{fullNewPath}" contains the correct value in the config file, CLI flag, or environment variable (in Docker only).',
            values: { fullNewPath },
          }),
          i18n.translate('kbnConfig.deprecations.conflictSetting.manualStepTwoMessage', {
            defaultMessage: 'Remove "{fullOldPath}" from the config.',
            values: { fullOldPath },
          }),
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
    title: getDeprecationTitle(fullPath),
    message: i18n.translate('kbnConfig.deprecations.unusedSettingMessage', {
      defaultMessage: 'You no longer need to configure "{fullPath}".',
      values: { fullPath },
    }),
    correctiveActions: {
      manualSteps: [
        i18n.translate('kbnConfig.deprecations.unusedSetting.manualStepOneMessage', {
          defaultMessage:
            'Remove "{fullPath}" from the Kibana config file, CLI flag, or environment variable (in Docker only).',
          values: { fullPath },
        }),
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
