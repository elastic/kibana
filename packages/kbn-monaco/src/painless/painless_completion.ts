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

import { monaco } from '../monaco';
import { PainlessCompletionResult, PainlessCompletionKind } from './types';

const getCompletionKind = (kind: PainlessCompletionKind): monaco.languages.CompletionItemKind => {
  const monacoItemKind = monaco.languages.CompletionItemKind;

  switch (kind) {
    case 'type':
      return monacoItemKind.Interface;
    case 'class':
      return monacoItemKind.Class;
    case 'method':
      return monacoItemKind.Method;
    case 'constructor':
      return monacoItemKind.Constructor;
    case 'property':
      return monacoItemKind.Property;
  }
  return monacoItemKind.Property;
};

export class PainlessCompletionAdapter implements monaco.languages.CompletionItemProvider {
  // @ts-ignore
  constructor(private _worker) {}

  public get triggerCharacters(): string[] {
    return ['.'];
  }

  provideCompletionItems(
    model: monaco.editor.IReadOnlyModel,
    position: monaco.Position,
    context: monaco.languages.CompletionContext,
    token: monaco.CancellationToken
  ): Promise<monaco.languages.CompletionList> {
    const resource = model.uri;

    // Active line characters
    const currentLineChars = model.getValueInRange({
      startLineNumber: position.lineNumber,
      startColumn: 0,
      endLineNumber: position.lineNumber,
      endColumn: position.column,
    });

    return this._worker(resource)
      .then((worker: any) => {
        return worker.provideAutocompleteSuggestions(resource.toString(), currentLineChars);
      })
      .then((completionInfo: PainlessCompletionResult) => {
        const wordInfo = model.getWordUntilPosition(position);
        const wordRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: wordInfo.startColumn,
          endColumn: wordInfo.endColumn,
        };

        const suggestions = completionInfo.suggestions.map(
          ({ label, insertText, documentation, kind }) => {
            return {
              label,
              insertText,
              documentation,
              range: wordRange,
              kind: getCompletionKind(kind),
            };
          }
        );

        return {
          isIncomplete: completionInfo.isIncomplete,
          suggestions,
        };
      });
  }
}
