/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco, shellLanguage } from '../../../monaco_imports';

interface ShellWords {
  keywords: string[];
  builtins: string[];
}

const { keywords, builtins } = shellLanguage as unknown as ShellWords;

/** Suggests shell keywords and builtins from Monaco's shell grammar. */
export const getShellSuggestionProvider = (): monaco.languages.CompletionItemProvider => ({
  provideCompletionItems: (model: monaco.editor.ITextModel, position: monaco.Position) => {
    const word = model.getWordUntilPosition(position);
    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn,
    };

    const toItem = (
      label: string,
      kind: monaco.languages.CompletionItemKind
    ): monaco.languages.CompletionItem => ({
      label,
      kind,
      insertText: label,
      range,
    });

    return {
      suggestions: [
        ...keywords.map((label) => toItem(label, monaco.languages.CompletionItemKind.Keyword)),
        ...builtins.map((label) => toItem(label, monaco.languages.CompletionItemKind.Function)),
      ],
    };
  },
});
