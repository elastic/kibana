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
  FactoryConfigDeprecationDetails,
  ConfigDeprecationCommand,
} from './types';

const getDeprecationTitle = (deprecationPath: string) => {
  return i18n.translate('kbnConfig.deprecations.deprecatedSettingTitle', {
    defaultMessage: 'Setting "{deprecationPath}" is deprecated',
    values: { deprecationPath },
  });
};

const _deprecate = (
  config: Record<string, any>,
  rootPath: string,
  addDeprecation: AddConfigDeprecation,
  deprecatedKey: string,
  removeBy: string,
  details: FactoryConfigDeprecationDetails
): void => {
  const fullPath = getPath(rootPath, deprecatedKey);
  if (get(config, fullPath) === undefined) {
    return;
  }
  addDeprecation({
    configPath: fullPath,
    title: getDeprecationTitle(fullPath),
    message: i18n.translate('kbnConfig.deprecations.deprecatedSettingMessage', {
      defaultMessage: 'Configuring "{fullPath}" is deprecated and will be removed in {removeBy}.',
      values: { fullPath, removeBy },
    }),
    correctiveActions: {
      manualSteps: [
        i18n.translate('kbnConfig.deprecations.deprecatedSetting.manualStepOneMessage', {
          defaultMessage:
            'Remove "{fullPath}" from the Kibana config file, CLI flag, or environment variable (in Docker only) before upgrading to {removeBy}.',
          values: { fullPath, removeBy },
        }),
      ],
    },
    ...details,
  });
};

const _rename = (
  config: Record<string, any>,
  rootPath: string,
  addDeprecation: AddConfigDeprecation,
  oldKey: string,
  newKey: string,
  details: FactoryConfigDeprecationDetails
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
      configPath: fullOldPath,
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
      configPath: fullOldPath,
      title: getDeprecationTitle(fullOldPath),
      message: i18n.translate('kbnConfig.deprecations.conflictSettingMessage', {
        defaultMessage:
          'Setting "{fullOldPath}" has been replaced by "{fullNewPath}". However, both keys are present. Ignoring "{fullOldPath}"',
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
  details: FactoryConfigDeprecationDetails
): void | ConfigDeprecationCommand => {
  const fullPath = getPath(rootPath, unusedKey);
  if (get(config, fullPath) === undefined) {
    return;
  }
  addDeprecation({
    configPath: fullPath,
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

const deprecate =
  (
    unusedKey: string,
    removeBy: string,
    details: FactoryConfigDeprecationDetails
  ): ConfigDeprecation =>
  (config, rootPath, addDeprecation) =>
    _deprecate(config, rootPath, addDeprecation, unusedKey, removeBy, details);

const deprecateFromRoot =
  (
    unusedKey: string,
    removeBy: string,
    details: FactoryConfigDeprecationDetails
  ): ConfigDeprecation =>
  (config, rootPath, addDeprecation) =>
    _deprecate(config, '', addDeprecation, unusedKey, removeBy, details);

const rename =
  (oldKey: string, newKey: string, details: FactoryConfigDeprecationDetails): ConfigDeprecation =>
  (config, rootPath, addDeprecation) =>
    _rename(config, rootPath, addDeprecation, oldKey, newKey, details);

const renameFromRoot =
  (oldKey: string, newKey: string, details: FactoryConfigDeprecationDetails): ConfigDeprecation =>
  (config, rootPath, addDeprecation) =>
    _rename(config, '', addDeprecation, oldKey, newKey, details);

const unused =
  (unusedKey: string, details: FactoryConfigDeprecationDetails): ConfigDeprecation =>
  (config, rootPath, addDeprecation) =>
    _unused(config, rootPath, addDeprecation, unusedKey, details);

const unusedFromRoot =
  (unusedKey: string, details: FactoryConfigDeprecationDetails): ConfigDeprecation =>
  (config, rootPath, addDeprecation) =>
    _unused(config, '', addDeprecation, unusedKey, details);

const getPath = (rootPath: string, subPath: string) =>
  rootPath !== '' ? `${rootPath}.${subPath}` : subPath;

/**
 * The actual platform implementation of {@link ConfigDeprecationFactory}
 *
 * @internal
 */
export const configDeprecationFactory: ConfigDeprecationFactory = {
  deprecate,
  deprecateFromRoot,
  rename,
  renameFromRoot,
  unused,
  unusedFromRoot,
};
