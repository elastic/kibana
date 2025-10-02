/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monarch } from '@elastic/monaco-esql';
import * as monarchDefinitions from '@elastic/monaco-esql/lib/definitions';
import { esqlFunctionNames } from '@kbn/esql-ast/src/definitions/generated/function_names';
import {
  suggest,
  validateQuery,
  getHoverItem,
  type ESQLCallbacks,
} from '@kbn/esql-validation-autocomplete';
import type { ESQLTelemetryCallbacks } from '@kbn/esql-types';
import { monaco } from '../../monaco_imports';
import type { CustomLangModuleType } from '../../types';
import { ESQL_LANG_ID } from './lib/constants';
import { wrapAsMonacoMessages } from './lib/converters/positions';
import { wrapAsMonacoSuggestions } from './lib/converters/suggestions';
import { getDecorationHoveredMessages, monacoPositionToOffset } from './lib/shared/utils';
import { buildEsqlTheme } from './lib/theme';

const removeKeywordSuffix = (name: string) => {
  return name.endsWith('.keyword') ? name.slice(0, -8) : name;
};

export const ESQL_AUTOCOMPLETE_TRIGGER_CHARS = ['(', ' ', '[', '?'];

export type MonacoMessage = monaco.editor.IMarkerData & { code: string };

export type ESQLDependencies = ESQLCallbacks &
  Partial<{
    telemetry: ESQLTelemetryCallbacks;
  }>;

export const ESQLLang: CustomLangModuleType<ESQLDependencies, MonacoMessage> = {
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
  getHoverProvider: (deps?: ESQLDependencies): monaco.languages.HoverProvider => {
    let lastHoveredWord: string;

    return {
      async provideHover(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        token: monaco.CancellationToken
      ) {
        const fullText = model.getValue();
        const offset = monacoPositionToOffset(fullText, position);
        const hoveredWord = model.getWordAtPosition(position);

        // Monaco triggers the hover event on each char of the word,
        // we only want to track the Hover if the word changed.
        if (
          hoveredWord &&
          hoveredWord.word !== lastHoveredWord &&
          deps?.telemetry?.onDecorationHoverShown
        ) {
          lastHoveredWord = hoveredWord.word;

          const hoverMessages = getDecorationHoveredMessages(hoveredWord, position, model);
          if (hoverMessages.length) {
            deps?.telemetry?.onDecorationHoverShown(hoverMessages.join(', '));
          }
        }

        return getHoverItem(fullText, offset, deps);
      },
    };
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
        return wrapAsMonacoSuggestions(suggestions, fullText);
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
