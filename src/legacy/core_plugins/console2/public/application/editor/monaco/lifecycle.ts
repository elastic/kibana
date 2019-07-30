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

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { Language } from '../language';
import { injectJS } from './injected_worker_utils';

const MonacoEnvironment = 'MonacoEnvironment';

let worker: monaco.editor.MonacoWebWorker<any>;
const disposables: monaco.IDisposable[] = [];

function createMonacoGlobals() {
  (window as any)[MonacoEnvironment] = {};
}

export function setup() {
  createMonacoGlobals();
}

export function teardown() {
  delete (window as any)[MonacoEnvironment];
}

const loadLanguage = (lang: Language, workerSrc: string, completionItemProviderFactory: any) => {
  registerWorker(lang, workerSrc);

  disposables.push(monaco.languages.setMonarchTokensProvider(lang.id, lang.def));
  disposables.push(monaco.languages.setLanguageConfiguration(lang.id, lang.conf));
  disposables.push(
    monaco.languages.registerCompletionItemProvider(lang.id, completionItemProviderFactory(worker))
  );
};

export function registerLanguage(
  lang: Language,
  workerSrc: string,
  completionItemProviderFactory: (worker: any) => monaco.languages.CompletionItemProvider
) {
  monaco.languages.register(lang);

  monaco.languages.onLanguage(lang.id, () => {
    loadLanguage(lang, workerSrc, completionItemProviderFactory);
  });
}

export function registerWorker(lang: Language, src: string) {
  // major hackery for now
  worker = monaco.editor.createWebWorker<any>({
    label: lang.id,
    createData: {},
    moduleId: lang.id,
  });

  (window as any).MonacoEnvironment.getWorker = () => {
    const finalBlob = `
    ${injectJS.code}
    
    ${src}
    `;
    const blob = new Blob([finalBlob], { type: 'application/javascript' });
    return new Worker(window.URL.createObjectURL(blob));
  };
}
