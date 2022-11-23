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

import jsonWorkerSrc from '!!raw-loader!../../target_workers/json.editor.worker.js';
import xJsonWorkerSrc from '!!raw-loader!../../target_workers/xjson.editor.worker.js';
import defaultWorkerSrc from '!!raw-loader!../../target_workers/default.editor.worker.js';
import painlessWorkerSrc from '!!raw-loader!../../target_workers/painless.editor.worker.js';

/**
 * Register languages and lexer rules
 */
registerLanguage(XJsonLang);
registerLanguage(PainlessLang);
registerLanguage(EsqlLang);

/**
 * Create web workers by language ID
 */
const mapLanguageIdToWorker: { [key: string]: any } = {
  [XJsonLang.ID]: xJsonWorkerSrc,
  [PainlessLang.ID]: painlessWorkerSrc,
  [monaco.languages.json.jsonDefaults.languageId]: jsonWorkerSrc,
};

// @ts-ignore
window.MonacoEnvironment = {
  // needed for functional tests so that we can get value from 'editor'
  monaco,
  getWorker: (module: string, languageId: string) => {
    const workerSrc = mapLanguageIdToWorker[languageId] || defaultWorkerSrc;

    const blob = new Blob([workerSrc], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
  },
};
