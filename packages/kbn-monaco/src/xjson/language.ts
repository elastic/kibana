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

// This file contains a lot of single setup logic for registering a language globally

import { monaco } from '../monaco';
import { WorkerProxyService } from './worker_proxy_service';
import { registerLexerRules } from './lexer_rules';
import { ID } from './constants';
// @ts-ignore
import workerSrc from '!!raw-loader!../../target/public/xjson.editor.worker.js';

const wps = new WorkerProxyService();

// Register rules against shared monaco instance.
registerLexerRules(monaco);

// In future we will need to make this map languages to workers using "id" and/or "label" values
// that get passed in.
// @ts-ignore
window.MonacoEnvironment = {
  getWorker: (id: any, label: any) => {
    // In kibana we will probably build this once and then load with raw-loader
    const blob = new Blob([workerSrc], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
  },
};

monaco.languages.onLanguage(ID, async () => {
  return wps.setup();
});

const OWNER = 'XJSON_GRAMMAR_CHECKER';
export const registerGrammarChecker = (editor: monaco.editor.IEditor) => {
  const allDisposables: monaco.IDisposable[] = [];

  const updateAnnos = async () => {
    const { annotations } = await wps.getAnnos();
    const model = editor.getModel() as monaco.editor.ITextModel | null;
    if (!model) {
      return;
    }
    monaco.editor.setModelMarkers(
      model,
      OWNER,
      annotations.map(({ at, text, type }) => {
        const { column, lineNumber } = model.getPositionAt(at);
        return {
          startLineNumber: lineNumber,
          startColumn: column,
          endLineNumber: lineNumber,
          endColumn: column,
          message: text,
          severity: type === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
        };
      })
    );
  };

  const onModelAdd = (model: monaco.editor.IModel) => {
    allDisposables.push(
      model.onDidChangeContent(async () => {
        updateAnnos();
      })
    );

    updateAnnos();
  };

  allDisposables.push(monaco.editor.onDidCreateModel(onModelAdd));
  monaco.editor.getModels().forEach(onModelAdd);
  return () => {
    wps.stop();
    allDisposables.forEach((d) => d.dispose());
  };
};
