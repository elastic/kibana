/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerLanguage } from '../helpers';

import { XJsonLang, XJSON_LANG_ID } from './xjson';
import { PainlessLang, PAINLESS_LANG_ID } from './painless';
import { SQLLang, SQL_LANG_ID } from './sql';
import { ESQLLang, ESQL_LANG_ID } from './esql';
import { YamlLang, YAML_LANG_ID } from './yaml';
import { ConsoleLang, ConsoleOutputLang, CONSOLE_LANG_ID, CONSOLE_OUTPUT_LANG_ID } from './console';
import { MarkdownLang, MARKDOWN_LANG_ID } from './markdown';
import { GrokLang, GROK_LANG_ID } from './grok';
import { HandlebarsLang, HANDLEBARS_LANG_ID } from './handlebars';
import { CssLang, CSS_LANG_ID } from './css';
import { HJsonLang, HJSON_LANG_ID } from './hjson';

// export all language ids
export {
  XJSON_LANG_ID,
  SQL_LANG_ID,
  ESQL_LANG_ID,
  YAML_LANG_ID,
  CONSOLE_LANG_ID,
  CONSOLE_OUTPUT_LANG_ID,
  MARKDOWN_LANG_ID,
  GROK_LANG_ID,
  HANDLEBARS_LANG_ID,
  CSS_LANG_ID,
  HJSON_LANG_ID,
  PAINLESS_LANG_ID,
};

// export all language definitions
export {
  XJsonLang,
  PainlessLang,
  SQLLang,
  ESQLLang,
  YamlLang,
  ConsoleLang,
  ConsoleOutputLang,
  MarkdownLang,
  GrokLang,
  HandlebarsLang,
  CssLang,
  HJsonLang,
};

export { ESQL_DARK_THEME_ID, ESQL_LIGHT_THEME_ID, ESQL_AUTOCOMPLETE_TRIGGER_CHARS } from './esql';
export {
  CONSOLE_THEME_ID,
  CONSOLE_OUTPUT_THEME_ID,
  getParsedRequestsProvider,
  ConsoleParsedRequestsProvider,
  createOutputParser,
} from './console';
export type { ParsedRequest } from './console';
export * from './painless';
export { configureMonacoYamlSchema } from './yaml';

export const initializeSupportedLanguages = () => {
  [
    XJsonLang,
    PainlessLang,
    SQLLang,
    ESQLLang,
    YamlLang,
    ConsoleLang,
    ConsoleOutputLang,
    MarkdownLang,
    GrokLang,
    HandlebarsLang,
    CssLang,
    HJsonLang,
  ].forEach((lang) => registerLanguage(lang));
};
