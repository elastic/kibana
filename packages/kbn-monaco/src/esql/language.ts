/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
const removeKeywordSuffix = (name: string) => {
  return name.endsWith('.keyword') ? name.slice(0, -8) : name;
};

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
      { open: '"""', close: '"""' },
      { open: '"', close: '"' },
    ],
    surroundingPairs: [
      { open: '(', close: ')' },
      { open: `'`, close: `'` },
      { open: '"""', close: '"""' },
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
        const suggestions = await astAdapter.autocomplete(model, position, context);
        return {
          // @ts-expect-error because of range typing: https://github.com/microsoft/monaco-editor/issues/4638
          suggestions: wrapAsMonacoSuggestions(suggestions),
        };
      },
      async resolveCompletionItem(item, token): Promise<monaco.languages.CompletionItem> {
        if (!callbacks?.getFieldsMetadata) return item;

        const fieldsMetadataClient = await callbacks?.getFieldsMetadata();

        if (
          !fieldsMetadataClient ||
          // If item is not a ECS field, no need to fetch metadata
          item.kind !== 4 ||
          // We set sortText to '1D' for ECS fields, so if not ECS, no need to fetch description
          item.sortText !== '1D' ||
          typeof item.label !== 'string'
        ) {
          return item;
        }

        const ecsMetadata = await fieldsMetadataClient.find({
          fieldNames: [removeKeywordSuffix(item.label)],
          attributes: ['description'],
        });

        const fieldMetadata = ecsMetadata.fields[item.label as string];
        if (fieldMetadata && fieldMetadata.description) {
          const completionItem: monaco.languages.CompletionItem = {
            ...item,
            documentation: {
              value: fieldMetadata.description,
            },
          };
          return completionItem;
        }

        return item;
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
