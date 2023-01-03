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
import { registerLanguage, registerTheme } from './helpers';

export const DEFAULT_WORKER_ID = 'default';
const langSpecificWorkerIds = [
  XJsonLang.ID,
  PainlessLang.ID,
  ESQLLang.ID,
  monaco.languages.json.jsonDefaults.languageId,
  'yaml',
];

/**
 * Register languages and lexer rules
 */
registerLanguage(XJsonLang);
registerLanguage(PainlessLang);
registerLanguage(SQLLang);
registerLanguage(ESQLLang);

/**
 * Register custom themes
 */
registerTheme(ESQL_THEME_ID, buildESQlTheme());

const monacoBundleDir = (window as any).__kbnPublicPath__?.['kbn-monaco'];

// @ts-ignore
window.MonacoEnvironment = {
  // needed for functional tests so that we can get value from 'editor'
  monaco,
  getWorkerUrl: monacoBundleDir
    ? (_: string, languageId: string) => {
        const workerId = langSpecificWorkerIds.includes(languageId)
          ? languageId
          : DEFAULT_WORKER_ID;
        return `${monacoBundleDir}${workerId}.editor.worker.js`;
      }
    : () => undefined,
};
