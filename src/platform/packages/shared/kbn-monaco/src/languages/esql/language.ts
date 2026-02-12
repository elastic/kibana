/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esqlFunctionNames } from '@kbn/esql-language/src/commands/definitions/generated/function_names';
import { monarch } from '@elastic/monaco-esql';
import {
  getSignatureHelp,
  getHoverItem,
  inlineSuggest,
  suggest,
  validateQuery,
} from '@kbn/esql-language';
import * as monarchDefinitions from '@elastic/monaco-esql/lib/definitions';
import type { ESQLTelemetryCallbacks, ESQLCallbacks } from '@kbn/esql-types';
import { PromQLLang } from '../promql';
import { monaco } from '../../monaco_imports';
import type { CustomLangModuleType } from '../../types';
import { ESQL_LANG_ID } from './lib/constants';
import { wrapAsMonacoMessages } from './lib/converters/positions';
import { wrapAsMonacoSuggestions } from './lib/converters/suggestions';
import {
  getDecorationHoveredMessages,
  filterSuggestionsWithCustomCommands,
  monacoPositionToOffset,
} from './lib/shared/utils';
import { buildEsqlTheme } from './lib/theme';

const removeKeywordSuffix = (name: string) => {
  return name.endsWith('.keyword') ? name.slice(0, -8) : name;
};

/**
 * Extracts the first source name from the FROM clause of an ES|QL query.
 * This is used to determine if we're querying from a stream and to fetch
 * stream-specific field metadata.
 *
 * Examples:
 * - "FROM logs | WHERE ..." -> "logs"
 * - "FROM logs.nginx | STATS ..." -> "logs.nginx"
 * - "FROM logs, metrics | ..." -> "logs" (first source only)
 * - "FROM logs* | ..." -> "logs*" (wildcard patterns are returned as-is)
 *
 * Returns undefined if no FROM clause is found.
 */
export const extractSourceFromQuery = (query: string): string | undefined => {
  // Match FROM clause followed by source name(s)
  // Source names can contain letters, numbers, dots, underscores, hyphens, and wildcards
  // The source name ends at whitespace, comma, pipe, or end of string
  const fromMatch = query.match(/\bFROM\s+([a-zA-Z0-9_.*-]+)/i);
  if (fromMatch && fromMatch[1]) {
    return fromMatch[1];
  }
  return undefined;
};

export const ESQL_AUTOCOMPLETE_TRIGGER_CHARS = ['(', ' ', '[', '?'];

export type MonacoMessage = monaco.editor.IMarkerData & {
  code: string;

  // By default warnings are not underlined, use this flag to indicate it should be
  underlinedWarning?: boolean;
};

export type ESQLDependencies = ESQLCallbacks &
  Partial<{
    telemetry: ESQLTelemetryCallbacks;
  }>;

export const ESQLLang: CustomLangModuleType<ESQLDependencies, MonacoMessage> = {
  ID: ESQL_LANG_ID,
  async onLanguage() {
    // PromQL can be embedded in ES|QL querys.
    // We need to manually trigger its language loading for it to work.
    await PromQLLang.onLanguage?.();

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
  validate: async (
    model: monaco.editor.ITextModel,
    code: string,
    callbacks?: ESQLCallbacks,
    options?: { invalidateColumnsCache?: boolean }
  ) => {
    const text = code ?? model.getValue();
    const { errors, warnings } = await validateQuery(text, callbacks, options);
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
  getInlineCompletionsProvider: (
    callbacks?: ESQLCallbacks
  ): monaco.languages.InlineCompletionsProvider => {
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

        return await inlineSuggest(fullText, textBeforeCursor, range, callbacks);
      },
      freeInlineCompletions: () => {},
    };

    return provider;
  },
  getSuggestionProvider: (deps?: ESQLDependencies): monaco.languages.CompletionItemProvider => {
    // Store the last query text so resolveCompletionItem can access it
    // to extract the stream name from the FROM clause
    let lastQueryText = '';

    return {
      triggerCharacters: ESQL_AUTOCOMPLETE_TRIGGER_CHARS,
      async provideCompletionItems(
        model: monaco.editor.ITextModel,
        position: monaco.Position
      ): Promise<monaco.languages.CompletionList> {
        const fullText = model.getValue();
        lastQueryText = fullText;
        const offset = monacoPositionToOffset(fullText, position);

        const computeStart = performance.now();
        const suggestions = await suggest(fullText, offset, deps);

        const suggestionsWithCustomCommands = filterSuggestionsWithCustomCommands(suggestions);
        if (suggestionsWithCustomCommands.length) {
          deps?.telemetry?.onSuggestionsWithCustomCommandShown?.(suggestionsWithCustomCommands);
        }

        const result = wrapAsMonacoSuggestions(suggestions, fullText);
        const computeEnd = performance.now();

        deps?.telemetry?.onSuggestionsReady?.(
          computeStart,
          computeEnd,
          model.getValueLength(),
          model.getLineCount()
        );

        return result;
      },
      async resolveCompletionItem(item, token): Promise<monaco.languages.CompletionItem> {
        if (!deps?.getFieldsMetadata) return item;
        const fieldsMetadataClient = await deps?.getFieldsMetadata;

        if (!fieldsMetadataClient || typeof item.label !== 'string') return item;

        // Only fetch metadata for field suggestions
        if (item.kind !== monaco.languages.CompletionItemKind.Variable) return item;

        const strippedFieldName = removeKeywordSuffix(item.label);

        // Extract stream name from the FROM clause to fetch stream-specific field descriptions
        const streamName = extractSourceFromQuery(lastQueryText);

        let streamDescription: string | undefined;
        let ecsDescription: string | undefined;

        // Try to fetch stream-specific field metadata (if querying from a stream)
        if (streamName) {
          const streamMetadata = await fieldsMetadataClient.find({
            fieldNames: [strippedFieldName],
            attributes: ['description'],
            streamName,
          });

          const streamFieldMetadata = streamMetadata.fields[strippedFieldName];
          if (streamFieldMetadata && streamFieldMetadata.description) {
            streamDescription = streamFieldMetadata.description;
          }
        }

        // Also fetch ECS/OTel metadata
        const fullEcsMetadataList = await fieldsMetadataClient.find({
          attributes: ['type'],
        });

        if (Object.hasOwn(fullEcsMetadataList?.fields, strippedFieldName)) {
          const ecsMetadata = await fieldsMetadataClient.find({
            fieldNames: [strippedFieldName],
            attributes: ['description'],
          });

          const fieldMetadata = ecsMetadata.fields[strippedFieldName];
          if (fieldMetadata && fieldMetadata.description) {
            ecsDescription = fieldMetadata.description;
          }
        }

        // Merge descriptions if both exist, otherwise use whichever is available
        if (streamDescription && ecsDescription) {
          return {
            ...item,
            documentation: {
              value: `**Stream description:**\n${streamDescription}\n\n**ECS/OTel description:**\n${ecsDescription}`,
            },
          };
        } else if (streamDescription) {
          return {
            ...item,
            documentation: {
              value: streamDescription,
            },
          };
        } else if (ecsDescription) {
          return {
            ...item,
            documentation: {
              value: ecsDescription,
            },
          };
        }

        return item;
      },
    };
  },
  getSignatureProvider: (deps?: ESQLDependencies): monaco.languages.SignatureHelpProvider => {
    return {
      signatureHelpTriggerCharacters: ['(', ','],
      signatureHelpRetriggerCharacters: ['(', ','],
      async provideSignatureHelp(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        token: monaco.CancellationToken,
        context: monaco.languages.SignatureHelpContext
      ): Promise<monaco.languages.SignatureHelpResult | null> {
        const fullText = model.getValue();
        const offset = monacoPositionToOffset(fullText, position);
        const signatureHelp = await getSignatureHelp(fullText, offset, deps);

        if (!signatureHelp) {
          return null;
        }

        const { signatures, activeSignature, activeParameter } = signatureHelp;

        return {
          value: {
            signatures: signatures.map(({ label, documentation, parameters }) => ({
              label,
              documentation: documentation ? { value: documentation } : undefined,
              parameters: parameters.map(({ label: paramLabel, documentation: paramDoc }) => ({
                label: paramLabel,
                documentation: paramDoc ? { value: paramDoc } : undefined,
              })),
            })),
            activeSignature,
            activeParameter,
          },
          dispose: () => {},
        };
      },
    };
  },
};
