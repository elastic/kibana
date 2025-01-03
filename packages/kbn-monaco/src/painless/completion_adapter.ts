/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '../monaco_imports';
import { EditorStateService } from './lib';
import type { PainlessCompletionResult, PainlessCompletionKind } from './types';
import type { PainlessWorker } from './worker';

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
