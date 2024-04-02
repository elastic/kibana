/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ESQLCallbacks } from '@kbn/esql-validation-autocomplete';
import { monaco } from '../monaco_imports';

import { ESQL_LANG_ID } from './lib/constants';

import type { CustomLangModuleType } from '../types';
import type { ESQLWorker } from './worker/esql_worker';

import { WorkerProxyService } from '../common/worker_proxy';
import { ESQLAstAdapter } from './lib/esql_ast_provider';
import { wrapAsMonacoSuggestions } from './lib/converters/suggestions';
import { wrapAsMonacoCodeActions } from './lib/converters/actions';

const workerProxyService = new WorkerProxyService<ESQLWorker>();

export const ESQLLang: CustomLangModuleType<ESQLCallbacks> = {
  ID: ESQL_LANG_ID,
  async onLanguage() {
    const { ESQLTokensProvider } = await import('./lib');

    workerProxyService.setup(ESQL_LANG_ID);

    monaco.languages.setTokensProvider(ESQL_LANG_ID, new ESQLTokensProvider());
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
          suggestions: wrapAsMonacoSuggestions(suggestionEntries.suggestions),
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
          actions: wrapAsMonacoCodeActions(model, actions),
          dispose: () => {},
        };
      },
    };
  },
};
