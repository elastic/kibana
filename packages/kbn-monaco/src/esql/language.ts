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
import type { ESQLCallbacks } from './lib/ast/shared/types';
import { ESQLAstAdapter } from './lib/monaco/esql_ast_provider';

const workerProxyService = new WorkerProxyService<ESQLWorker>();

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
      { open: '[', close: ']' },
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
    return await astAdapter.validate(model, code);
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
      triggerCharacters: [',', '(', '=', ' ', '[', ''],
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

  getCodeActionProvider: (callbacks?: ESQLCallbacks): monaco.languages.CodeActionProvider => {
    return {
      async provideCodeActions(
        model /** ITextModel*/,
        range /** Range*/,
        context /** CodeActionContext*/,
        token /** CancellationToken*/
      ) {
        const astAdapter = new ESQLAstAdapter(
          (...uris) => workerProxyService.getWorker(uris),
          callbacks
        );
        const actions = await astAdapter.codeAction(model, range, context);
        return {
          actions,
          dispose: () => {},
        };
      },
    };
  },
};
