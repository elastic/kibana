/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { XJsonLang } from './xjson';
import { PainlessLang } from './painless';
import { EsqlLang } from './esql';
import { monaco } from './monaco_imports';
import { registerLanguage } from './helpers';

/**
 * Register languages and lexer rules
 */
registerLanguage(XJsonLang);
registerLanguage(PainlessLang);
registerLanguage(EsqlLang);

/**
 * For these language IDs we have specific worker
 * implementations, everything else uses the default
 * worker
 */
const langSpecificWorkerIds = [
  XJsonLang.ID,
  PainlessLang.ID,
  monaco.languages.json.jsonDefaults.languageId,
];

const monacoBundlesPath = document
  .querySelector('meta[name=monacoBundlesPath]')
  ?.getAttribute('content');

// @ts-ignore
window.MonacoEnvironment = {
  // needed for functional tests so that we can get value from 'editor'
  monaco,
  getWorkerUrl: (_: string, languageId: string) => {
    const workerId = langSpecificWorkerIds.includes(languageId) ? languageId : 'default';
    return `${monacoBundlesPath}/${workerId}.editor.worker.js`;
  },
};
