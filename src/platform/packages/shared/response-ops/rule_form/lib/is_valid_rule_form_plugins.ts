/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RuleFormProps } from '../src/rule_form';

const requiredPluginNames = [
  'http',
  'i18n',
  'theme',
  'userProfile',
  'application',
  'notifications',
  'charts',
  'settings',
  'data',
  'unifiedSearch',
  'docLinks',
  'dataViews',
  'fieldsMetadata',
];

type RequiredRuleFormPlugins = Omit<
  RuleFormProps['plugins'],
  'actionTypeRegistry' | 'ruleTypeRegistry'
>;

export const isValidRuleFormPlugins = (input: unknown): input is RequiredRuleFormPlugins => {
  if (typeof input !== 'object' || input === null) {
    return false;
  }

  requiredPluginNames.forEach((pluginName) => {
    if (!(pluginName in input)) {
      // eslint-disable-next-line no-console
      console.error(`RuleForm plugins is missing required plugin: ${pluginName}`);
      return false;
    }
  });

  return true;
};
