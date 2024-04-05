/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { XJsonLang } from './xjson';
import { PainlessLang } from './painless';
import { SQLLang } from './sql';
import { monaco } from './monaco_imports';
import { ESQL_THEME_ID, ESQLLang, buildESQlTheme } from './esql';
import { YAML_LANG_ID } from './yaml';
import { registerLanguage, registerTheme } from './helpers';
import {
  ConsoleLang,
  ConsoleOutputLang,
  CONSOLE_THEME_ID,
  CONSOLE_OUTPUT_THEME_ID,
  buildConsoleTheme,
  buildConsoleOutputTheme,
} from './console';

export const DEFAULT_WORKER_ID = 'default';
const langSpecificWorkerIds = [
  XJsonLang.ID,
  PainlessLang.ID,
  ESQLLang.ID,
  monaco.languages.json.jsonDefaults.languageId,
  YAML_LANG_ID,
  ConsoleLang.ID,
  ConsoleOutputLang.ID,
];

/**
 * Register languages and lexer rules
 */
registerLanguage(XJsonLang);
registerLanguage(PainlessLang);
registerLanguage(SQLLang);
registerLanguage(ESQLLang);
registerLanguage(ConsoleLang);
registerLanguage(ConsoleOutputLang);

/**
 * Register custom themes
 */
registerTheme(ESQL_THEME_ID, buildESQlTheme());
registerTheme(CONSOLE_THEME_ID, buildConsoleTheme());
registerTheme(CONSOLE_OUTPUT_THEME_ID, buildConsoleOutputTheme());

const monacoBundleDir = (window as any).__kbnPublicPath__?.['kbn-monaco'];

window.MonacoEnvironment = {
  // @ts-expect-error needed for functional tests so that we can get value from 'editor'
  monaco,
  getWorkerUrl: monacoBundleDir
    ? (_: string, languageId: string) => {
        const workerId = langSpecificWorkerIds.includes(languageId)
          ? languageId
          : DEFAULT_WORKER_ID;
        return `${monacoBundleDir}${workerId}.editor.worker.js`;
      }
    : () => '',
};
