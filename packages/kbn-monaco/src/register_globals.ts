/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { XJsonLang } from './xjson';
import { PainlessLang } from './painless';
import { EsqlLang } from './esql';
import { monaco } from './monaco_imports';
// @ts-ignore
import xJsonWorkerSrc from '!!raw-loader!../target/public/xjson.editor.worker.js';
// @ts-ignore
import defaultWorkerSrc from '!!raw-loader!../target/public/default.editor.worker.js';

/**
 * Register languages and lexer rules
 */
monaco.languages.register({ id: XJsonLang.ID });
monaco.languages.setMonarchTokensProvider(XJsonLang.ID, XJsonLang.lexerRules);
monaco.languages.setLanguageConfiguration(XJsonLang.ID, XJsonLang.languageConfiguration);
monaco.languages.register({ id: PainlessLang.ID });
monaco.languages.setMonarchTokensProvider(PainlessLang.ID, PainlessLang.lexerRules);
monaco.languages.register({ id: EsqlLang.ID });
monaco.languages.setMonarchTokensProvider(EsqlLang.ID, EsqlLang.lexerRules);

/**
 * Create web workers by language ID
 */
const mapLanguageIdToWorker: { [key: string]: any } = {
  [XJsonLang.ID]: xJsonWorkerSrc,
};

// @ts-ignore
window.MonacoEnvironment = {
  getWorker: (module: string, languageId: string) => {
    const workerSrc = mapLanguageIdToWorker[languageId] || defaultWorkerSrc;

    const blob = new Blob([workerSrc], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
  },
};
