/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { XJsonLang } from './xjson';
import { PainlessLang } from './painless';
import { EsqlLang } from './esql';
import { monaco } from './monaco_imports';
// @ts-ignore
import xJsonWorkerSrc from '!!raw-loader!../target/public/xjson.editor.worker.js';
// @ts-ignore
import defaultWorkerSrc from '!!raw-loader!../target/public/default.editor.worker.js';
// @ts-ignore
import painlessWorkerSrc from '!!raw-loader!../target/public/painless.editor.worker.js';

/**
 * Register languages and lexer rules
 */
monaco.languages.register({ id: XJsonLang.ID });
monaco.languages.setMonarchTokensProvider(XJsonLang.ID, XJsonLang.lexerRules);
monaco.languages.setLanguageConfiguration(XJsonLang.ID, XJsonLang.languageConfiguration);
monaco.languages.register({ id: PainlessLang.ID });
monaco.languages.setMonarchTokensProvider(PainlessLang.ID, PainlessLang.lexerRules);
monaco.languages.setLanguageConfiguration(PainlessLang.ID, PainlessLang.languageConfiguration);
monaco.languages.register({ id: EsqlLang.ID });
monaco.languages.setMonarchTokensProvider(EsqlLang.ID, EsqlLang.lexerRules);

/**
 * Create web workers by language ID
 */
const mapLanguageIdToWorker: { [key: string]: any } = {
  [XJsonLang.ID]: xJsonWorkerSrc,
  [PainlessLang.ID]: painlessWorkerSrc,
};

// @ts-ignore
window.MonacoEnvironment = {
  getWorker: (module: string, languageId: string) => {
    const workerSrc = mapLanguageIdToWorker[languageId] || defaultWorkerSrc;

    const blob = new Blob([workerSrc], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
  },
};
