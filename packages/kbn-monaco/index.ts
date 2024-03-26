/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  CONSOLE_THEME_ID,
  getParsedRequestsProvider,
  ConsoleParsedRequestsProvider,
} from './src/console';

export type { ParsedRequest } from './src/console';
