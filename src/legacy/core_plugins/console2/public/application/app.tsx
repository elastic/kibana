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

import React from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import { Editor } from './editor';
import { useAppContext } from './context';
import * as konsoleLang from './konsole_lang';

const completionItemProvider = (worker: any): monaco.languages.CompletionItemProvider => ({
  async provideCompletionItems(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: monaco.languages.CompletionContext,
    token: any
  ): Promise<monaco.languages.CompletionList> {
    const workerProxy = await worker.getProxy();
    const results = await workerProxy.doComplete();
    return {
      incomplete: false,
      suggestions: results.map((result: any) => {
        return {
          insertText: result.insertText,
          kind: monaco.languages.CompletionItemKind.Value,
          label: result.label,
          range: { startColumn: 1, startLineNumber: 1, endColumn: 1, endLineNumber: 1 },
          documentation: result.documentation,
        };
      }),
    };
  },
  resolveCompletionItem(model, position, item, token) {
    return item;
  },
});

export const App = () => {
  const [ctx] = useAppContext();
  const { themeMode } = ctx;

  return (
    <Editor
      value={`POST /_rollup/job/t/_start`}
      language={konsoleLang.konsole}
      themeMode={themeMode}
      workerSrc={konsoleLang.worker.src}
      completionItemProviderFactory={completionItemProvider}
      options={{
        hover: { enabled: true },
        tabCompletion: true,
        readOnly: false,
        minimap: { enabled: false },
        quickSuggestions: true,
        scrollbar: {
          vertical: 'auto',
          horizontal: 'hidden',
        },
      }}
    />
  );
};
