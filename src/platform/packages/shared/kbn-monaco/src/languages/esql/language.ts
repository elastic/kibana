/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  validateQuery,
  type ESQLCallbacks,
  suggest,
  inlineSuggest,
} from '@kbn/esql-validation-autocomplete';
import { esqlFunctionNames } from '@kbn/esql-ast/src/definitions/generated/function_names';
import { monarch } from '@elastic/monaco-esql';
import * as monarchDefinitions from '@elastic/monaco-esql/lib/definitions';
import { monaco } from '../../monaco_imports';
import type { CustomLangModuleType } from '../../types';
import { ESQL_LANG_ID } from './lib/constants';
import { wrapAsMonacoMessages } from './lib/converters/positions';
import { wrapAsMonacoSuggestions } from './lib/converters/suggestions';
import { getHoverItem } from './lib/hover/hover';
import { monacoPositionToOffset } from './lib/shared/utils';
import { buildEsqlTheme } from './lib/theme';

const removeKeywordSuffix = (name: string) => {
  return name.endsWith('.keyword') ? name.slice(0, -8) : name;
};

export const ESQL_AUTOCOMPLETE_TRIGGER_CHARS = ['(', ' ', '[', '?'];

// Global state for LLM trigger tracking (outside provider instances)
const globalLLMTriggerState = {
  isTriggered: false,
};

export type MonacoMessage = monaco.editor.IMarkerData & { code: string };

export const ESQLLang: CustomLangModuleType<ESQLCallbacks, MonacoMessage> = {
  ID: ESQL_LANG_ID,
  async onLanguage() {
    const language = monarch.create({
      ...monarchDefinitions,
      functions: esqlFunctionNames,
    });

    monaco.languages.setMonarchTokensProvider(ESQL_LANG_ID, language);
  },
  languageThemeResolver: buildEsqlTheme,
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
    const text = code ?? model.getValue();
    const { errors, warnings } = await validateQuery(text, undefined, callbacks);
    const monacoErrors = wrapAsMonacoMessages(text, errors);
    const monacoWarnings = wrapAsMonacoMessages(text, warnings);
    return { errors: monacoErrors, warnings: monacoWarnings };
  },
  getHoverProvider: (callbacks?: ESQLCallbacks): monaco.languages.HoverProvider => {
    return {
      async provideHover(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        token: monaco.CancellationToken
      ) {
        return getHoverItem(model, position, callbacks);
      },
    };
  },
  getInlineCompletionsProvider: (
    callbacks?: ESQLCallbacks
  ): monaco.languages.InlineCompletionsProvider & { triggerLLMSuggestions: () => void } => {
    const provider = {
      async provideInlineCompletions(model: monaco.editor.ITextModel, position: monaco.Position) {
        const fullText = model.getValue();
        // Get the text before the cursor
        const textBeforeCursor = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const range = new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column
        );

        const triggerKind = globalLLMTriggerState.isTriggered
          ? ('manual' as const)
          : ('automatic' as const);

        // Reset flag after window expires naturally
        if (globalLLMTriggerState.isTriggered) {
          globalLLMTriggerState.isTriggered = false;
        }

        return await inlineSuggest(fullText, textBeforeCursor, range, callbacks, triggerKind);
      },
      freeInlineCompletions: () => {},
      triggerLLMSuggestions: () => {
        globalLLMTriggerState.isTriggered = true;
      },
    };

    return provider;
  },
  getSuggestionProvider: (callbacks?: ESQLCallbacks): monaco.languages.CompletionItemProvider => {
    return {
      triggerCharacters: ESQL_AUTOCOMPLETE_TRIGGER_CHARS,
      async provideCompletionItems(
        model: monaco.editor.ITextModel,
        position: monaco.Position
      ): Promise<monaco.languages.CompletionList> {
        const fullText = model.getValue();
        const offset = monacoPositionToOffset(fullText, position);
        const suggestions = await suggest(fullText, offset, callbacks);
        return {
          // @ts-expect-error because of range typing: https://github.com/microsoft/monaco-editor/issues/4638
          suggestions: wrapAsMonacoSuggestions(suggestions, fullText),
        };
      },
      async resolveCompletionItem(item, token): Promise<monaco.languages.CompletionItem> {
        if (!callbacks?.getFieldsMetadata) return item;
        const fieldsMetadataClient = await callbacks?.getFieldsMetadata;

        const fullEcsMetadataList = await fieldsMetadataClient?.find({
          attributes: ['type'],
        });
        if (!fullEcsMetadataList || !fieldsMetadataClient || typeof item.label !== 'string')
          return item;

        const strippedFieldName = removeKeywordSuffix(item.label);
        if (
          // If item is not a field, no need to fetch metadata
          item.kind === monaco.languages.CompletionItemKind.Variable &&
          // If not ECS, no need to fetch description
          Object.hasOwn(fullEcsMetadataList?.fields, strippedFieldName)
        ) {
          const ecsMetadata = await fieldsMetadataClient.find({
            fieldNames: [strippedFieldName],
            attributes: ['description'],
          });

          const fieldMetadata = ecsMetadata.fields[strippedFieldName];
          if (fieldMetadata && fieldMetadata.description) {
            const completionItem: monaco.languages.CompletionItem = {
              ...item,
              documentation: {
                value: fieldMetadata.description,
              },
            };
            return completionItem;
          }
        }

        return item;
      },
    };
  },
};
