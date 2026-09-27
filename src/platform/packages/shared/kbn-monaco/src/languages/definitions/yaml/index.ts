/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MonacoYaml } from 'monaco-yaml';
import { type MonacoYamlOptions } from 'monaco-yaml';
import { monaco } from '../../../monaco_imports';
import type { LangModuleType } from '../../../types';
import { languageConfiguration, lexerRules } from './language';
import { ID } from './constants';

declare module 'monaco-types' {
  // IDisposable gets broken within the monaco-types which is a transitive dependecy of monaco-yaml
  export type IDisposable = monaco.IDisposable;
}

export { ID as YAML_LANG_ID, type MonacoYaml, type MonacoYamlOptions };

export const YamlLang: LangModuleType = { ID, languageConfiguration, lexerRules };

const monacoYamlDefaultOptions: MonacoYamlOptions = {
  completion: true,
  hover: true,
  validate: true,
};

export const configureMonacoYamlSchema = async (
  schemas: MonacoYamlOptions['schemas'],
  options?: Omit<Partial<MonacoYamlOptions>, 'schemas'>
) => {
  const { configureMonacoYaml } = await import(/* webpackChunkName: "monaco-yaml" */ 'monaco-yaml');

  const finalOptions: MonacoYamlOptions = {
    ...monacoYamlDefaultOptions,
    ...(options || {}),
    schemas,
  };

  return configureMonacoYaml(monaco, finalOptions);
};
