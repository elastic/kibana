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

import { monaco } from '../monaco_imports';
import { EditorStateService } from './lib';
import { PainlessCompletionResult, PainlessCompletionKind } from './types';
import { PainlessWorker } from './worker';

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
    case 'keyword':
      return monacoItemKind.Keyword;
    case 'field':
      return monacoItemKind.Field;
    default:
      return monacoItemKind.Text;
  }
};

export class PainlessCompletionAdapter implements monaco.languages.CompletionItemProvider {
  constructor(
    private worker: {
      (...uris: monaco.Uri[]): Promise<PainlessWorker>;
      (arg0: monaco.Uri): Promise<PainlessWorker>;
    },
    private editorStateService: EditorStateService
  ) {}

  public get triggerCharacters(): string[] {
    return ['.', `'`];
  }

  async provideCompletionItems(
    model: monaco.editor.IReadOnlyModel,
    position: monaco.Position
  ): Promise<monaco.languages.CompletionList> {
    // Active line characters
    const currentLineChars = model.getValueInRange({
      startLineNumber: position.lineNumber,
      startColumn: 0,
      endLineNumber: position.lineNumber,
      endColumn: position.column,
    });

    const worker = await this.worker(model.uri);

    const { context, fields } = this.editorStateService.getState();
    const autocompleteInfo: PainlessCompletionResult = await worker.provideAutocompleteSuggestions(
      currentLineChars,
      context,
      fields
    );

    const wordInfo = model.getWordUntilPosition(position);
    const wordRange = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: wordInfo.startColumn,
      endColumn: wordInfo.endColumn,
    };

    const suggestions = autocompleteInfo.suggestions.map(
      ({ label, insertText, documentation, kind, insertTextAsSnippet }) => {
        return {
          label,
          insertText,
          documentation,
          range: wordRange,
          kind: getCompletionKind(kind),
          insertTextRules: insertTextAsSnippet
            ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
            : undefined,
        };
      }
    );

    return {
      incomplete: autocompleteInfo.isIncomplete,
      suggestions,
    };
  }
}
