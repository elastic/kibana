/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type MonacoYamlOptions } from 'monaco-yaml';
import { monaco } from '../monaco_imports';

export { ID as YAML_LANG_ID } from './constants';

const monacoYamlDefaultOptions: MonacoYamlOptions = {
  completion: true,
  hover: true,
  validate: true,
};

export const configureMonacoYamlSchema = async (schemas: MonacoYamlOptions['schemas']) => {
  const { configureMonacoYaml } = await import(/* webpackChunkName: "monaco-yaml" */ 'monaco-yaml');

  return configureMonacoYaml(monaco, {
    ...monacoYamlDefaultOptions,
    schemas,
  });
};
