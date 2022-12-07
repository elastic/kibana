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
];

const monacoBundlesPath = document
  .querySelector('meta[name=monacoBundlesPath]')
  ?.getAttribute('content');
if (!monacoBundlesPath) {
  throw new Error('unable to determine monaco bundles path');
}

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

// @ts-ignore
window.MonacoEnvironment = {
  // needed for functional tests so that we can get value from 'editor'
  monaco,
  async getWorker(languageId: string) {
    const workerId = langSpecificWorkerIds.includes(languageId) ? languageId : DEFAULT_WORKER_ID;
    const workerUrl = `${monacoBundlesPath}/${workerId}.editor.worker.js`;

    const resp = await fetch(workerUrl);
    if (resp.status !== 200) {
      throw new Error(`failed to fetch worker from server:\n  GET ${workerUrl} ${resp.statusText}`);
    }

    const source = await resp.text();
    const blob = new Blob([source], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
  },
};
