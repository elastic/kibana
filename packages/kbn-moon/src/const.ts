/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const MOON_CONFIG_KEY_ORDER = [
  '$schema',
  'id',
  'type',
  'owners',
  'toolchain',
  '*', // everything else
  'tags',
  'fileGroups',
  'tasks',
];

export const KIBANA_JSONC_FILENAME = 'kibana.jsonc';
export const MOON_CONST = {
  MOON_CONFIG_FILE_NAME: 'moon.yml',
  TEMPLATE_FILE_NAME: 'moon.template.yml',
  EXTENSION_FILE_NAME: 'moon.extend.yml',
  JEST_CONFIG_FILES: ['jest.config.js', 'jest.config.cjs', 'jest.config.json'],
  ESLINT_CONFIG_FILES: ['.eslintrc.js', '.eslintrc.json'],
  PROJECT_TYPE_UNKNOWN: 'unknown',
  DEFAULT_TOOLCHAIN: 'node',
  TAG_JEST_UNIT: 'jest-unit-tests',
  TAG_DEV: 'dev',
  TAG_PROD: 'prod',
  TAG_PACKAGE: 'package',
  TAG_PLUGIN: 'plugin',
  TAG_GROUP: 'group',
  TASK_NAME_JEST: 'jest',
  TASK_NAME_JEST_CI: 'jestCI',
  TASK_NAME_LINT: 'lint',
  FILE_GROUP_SRC: 'src',
};
