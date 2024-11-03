/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import './src/register_globals';

export {
  monaco,
  cssConf,
  cssLanguage,
  markdownConf,
  markdownLanguage,
  yamlConf,
  yamlLanguage,
} from './src/monaco_imports';
export { XJsonLang } from './src/xjson';
export { SQLLang } from './src/sql';
export { ESQL_LANG_ID, ESQL_THEME_ID, ESQLLang } from './src/esql';
export type { ESQLCallbacks } from '@kbn/esql-validation-autocomplete';

export * from './src/painless';
/* eslint-disable-next-line @kbn/eslint/module_migration */
import * as BarePluginApi from 'monaco-editor/esm/vs/editor/editor.api';
export { YAML_LANG_ID, configureMonacoYamlSchema } from './src/yaml';

import { registerLanguage } from './src/helpers';

export { BarePluginApi, registerLanguage };
export * from './src/types';

export {
  CONSOLE_LANG_ID,
  CONSOLE_OUTPUT_LANG_ID,
  CONSOLE_THEME_ID,
  getParsedRequestsProvider,
  ConsoleParsedRequestsProvider,
  createOutputParser,
} from './src/console';

export type { ParsedRequest } from './src/console';

export {
  CODE_EDITOR_LIGHT_THEME_ID,
  CODE_EDITOR_DARK_THEME_ID,
  CODE_EDITOR_LIGHT_THEME_TRANSPARENT_ID,
  CODE_EDITOR_DARK_THEME_TRANSPARENT_ID,
} from './src/code_editor';
