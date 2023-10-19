/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '../monaco_imports';

import { ESQL_LANG_ID } from './lib/constants';

import type { CustomLangModuleType } from '../types';
import type { ESQLWorker } from './worker/esql_worker';

import { DiagnosticsAdapter } from '../common/diagnostics_adapter';
import { WorkerProxyService } from '../common/worker_proxy';
import type { ESQLCallbacks } from './lib/ast/autocomplete/types';
import type { ESQLMessage } from './lib/ast/types';
import { ESQLAstAdapter } from './lib/monaco/esql_ast_provider';

const workerProxyService = new WorkerProxyService<ESQLWorker>();

// from linear offset to Monaco position
export function offsetToRowColumn(expression: string, offset: number): monaco.Position {
  const lines = expression.split(/\n/);
  let remainingChars = offset;
  let lineNumber = 1;
  for (const line of lines) {
    if (line.length >= remainingChars) {
      return new monaco.Position(lineNumber, remainingChars + 1);
    }
    remainingChars -= line.length + 1;
    lineNumber++;
  }

  throw new Error('Algorithm failure');
}

function wrapAsMonacoMessage(type: 'error' | 'warning', code: string, messages: ESQLMessage[]) {
  const fallbackPosition = { column: 0, lineNumber: 0 };
  return messages.map((e) => {
    const startPosition = e.location ? offsetToRowColumn(code, e.location.min) : fallbackPosition;
    const endPosition = e.location
      ? offsetToRowColumn(code, e.location.max || 0)
      : fallbackPosition;
    return {
      message: e.text,
      startColumn: startPosition.column,
      startLineNumber: startPosition.lineNumber,
      endColumn: endPosition.column + 1,
      endLineNumber: endPosition.lineNumber,
      severity: type === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
      _source: 'client' as const,
    };
  });
}

export const ESQLLang: CustomLangModuleType<ESQLCallbacks> = {
  ID: ESQL_LANG_ID,
  async onLanguage() {
    const { ESQLTokensProvider } = await import('./lib/monaco');

    workerProxyService.setup(ESQL_LANG_ID);

    monaco.languages.setTokensProvider(ESQL_LANG_ID, new ESQLTokensProvider());

    // handle syntax errors via the diagnostic adapter
    // but then enrich them via the separate validate function
    new DiagnosticsAdapter(ESQL_LANG_ID, (...uris) => workerProxyService.getWorker(uris));
  },
  languageConfiguration: {
    brackets: [
      ['(', ')'],
      ['[', ']'],
    ],
    autoClosingPairs: [
      { open: '(', close: ')' },
      { open: `'`, close: `'` },
      { open: '"', close: '"' },
    ],
    surroundingPairs: [
      { open: '(', close: ')' },
      { open: `'`, close: `'` },
      { open: '"', close: '"' },
    ],
  },
  validate: async (model: monaco.editor.ITextModel, code: string, callbacks?: ESQLCallbacks) => {
    const astAdapter = new ESQLAstAdapter(
      (...uris) => workerProxyService.getWorker(uris),
      callbacks
    );
    const { errors, warnings } = await astAdapter.validate(model, code);
    const monacoErrors = wrapAsMonacoMessage('error', code, errors);
    const monacoWarnings = wrapAsMonacoMessage('warning', code, warnings);
    return { errors: monacoErrors, warnings: monacoWarnings };
  },
  getSignatureProvider: (callbacks?: ESQLCallbacks): monaco.languages.SignatureHelpProvider => {
    return {
      signatureHelpTriggerCharacters: [' ', '('],
      async provideSignatureHelp(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        _token: monaco.CancellationToken,
        context: monaco.languages.SignatureHelpContext
      ) {
        const astAdapter = new ESQLAstAdapter(
          (...uris) => workerProxyService.getWorker(uris),
          callbacks
        );
        return astAdapter.suggestSignature(model, position, context);
      },
    };
  },
  getHoverProvider: (callbacks?: ESQLCallbacks): monaco.languages.HoverProvider => {
    return {
      async provideHover(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        token: monaco.CancellationToken
      ) {
        const astAdapter = new ESQLAstAdapter(
          (...uris) => workerProxyService.getWorker(uris),
          callbacks
        );
        return astAdapter.getHover(model, position, token);
      },
    };
  },
  getSuggestionProvider: (callbacks?: ESQLCallbacks): monaco.languages.CompletionItemProvider => {
    return {
      triggerCharacters: [',', '(', '=', ' '],
      async provideCompletionItems(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        context: monaco.languages.CompletionContext
      ): Promise<monaco.languages.CompletionList> {
        const astAdapter = new ESQLAstAdapter(
          (...uris) => workerProxyService.getWorker(uris),
          callbacks
        );
        const suggestionEntries = await astAdapter.autocomplete(model, position, context);
        return {
          suggestions: suggestionEntries.suggestions.map((suggestion) => ({
            ...suggestion,
            range: undefined as unknown as monaco.IRange,
          })),
        };
      },
    };
  },
};
