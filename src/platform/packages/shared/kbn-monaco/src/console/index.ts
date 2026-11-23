/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type ESQLCallbacks, suggest } from '@kbn/esql-validation-autocomplete';
import { MutableRefObject } from 'react';
/**
 * This import registers the Console monaco language contribution
 */
import { getParsedRequestsProvider } from './language';

import { monaco } from '../monaco_imports';
import type { LangModuleType } from '../types';
import { CONSOLE_LANG_ID, CONSOLE_OUTPUT_LANG_ID } from './constants';
import {
  lexerRules,
  languageConfiguration,
  consoleOutputLexerRules,
  consoleOutputLanguageConfiguration,
} from './lexer_rules';
import { foldingRangeProvider } from './folding_range_provider';
import { ESQL_AUTOCOMPLETE_TRIGGER_CHARS } from '../esql';
import { wrapAsMonacoSuggestions } from '../esql/lib/converters/suggestions';
import {
  checkForTripleQuotesAndEsqlQuery,
  findRequestLineNumber,
  getFallbackRequestStartPosition,
  unescapeInvalidChars,
} from './utils';

export { CONSOLE_LANG_ID, CONSOLE_OUTPUT_LANG_ID } from './constants';
/**
 * export the theme id for the console language
 */
export { CONSOLE_THEME_ID } from './language';

export const CONSOLE_TRIGGER_CHARS = ['/', '.', '_', ',', '?', '=', '&', '"'];

const findRequestAnchorLineNumber = (
  model: monaco.editor.ITextModel,
  positionLineNumber: number
): number | undefined =>
  findRequestLineNumber((lineNumber) => model.getLineContent(lineNumber), positionLineNumber, {
    direction: 'document',
  });

const getRequestAnchorPosition = async (
  model: monaco.editor.ITextModel,
  position: monaco.Position
): Promise<monaco.IPosition | undefined> => {
  const anchorLineNumber = findRequestAnchorLineNumber(model, position.lineNumber);
  if (anchorLineNumber !== undefined) {
    return { lineNumber: anchorLineNumber, column: 1 };
  }
  return getFallbackRequestStartPosition(
    await getParsedRequestsProvider(model).getRequests(),
    model,
    position.lineNumber,
    position.column
  );
};

const getRequestTextBeforeCursor = (
  model: monaco.editor.ITextModel,
  anchorPosition: monaco.IPosition,
  position: monaco.Position
): string => {
  return model.getValueInRange({
    startLineNumber: anchorPosition.lineNumber,
    startColumn: anchorPosition.column,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  });
};

/**
 * @description This language definition is used for the console input panel
 */
export const ConsoleLang: LangModuleType = {
  ID: CONSOLE_LANG_ID,
  lexerRules,
  languageConfiguration,
  foldingRangeProvider,
  getSuggestionProvider: (
    esqlCallbacks: Pick<ESQLCallbacks, 'getSources' | 'getPolicies'> | undefined,
    actionsProvider: MutableRefObject<{
      provideCompletionItems: monaco.languages.CompletionItemProvider['provideCompletionItems'];
    } | null>
  ): monaco.languages.CompletionItemProvider => {
    return {
      // force suggestions when these characters are used
      triggerCharacters: [...CONSOLE_TRIGGER_CHARS, ...ESQL_AUTOCOMPLETE_TRIGGER_CHARS],
      provideCompletionItems: async (
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        context: monaco.languages.CompletionContext,
        token: monaco.CancellationToken
      ) => {
        // NOTE: Materializing the full editor content (e.g. via `model.getValue()`) can be very
        // expensive for large inputs (like pasted JSON with huge string fields). The anchored
        // range below is bounded by the request-line lookback caps.
        const delegateToActionsProvider = () => {
          const actions = actionsProvider.current;
          return (
            actions?.provideCompletionItems(model, position, context, token) ?? {
              suggestions: [],
            }
          );
        };

        const requestAnchorPosition = await getRequestAnchorPosition(model, position);
        if (requestAnchorPosition === undefined) {
          return delegateToActionsProvider();
        }

        const requestTextBeforeCursor = getRequestTextBeforeCursor(
          model,
          requestAnchorPosition,
          position
        );
        const { insideTripleQuotes, insideEsqlQuery, esqlQueryIndex } =
          checkForTripleQuotesAndEsqlQuery(requestTextBeforeCursor);

        if (esqlCallbacks && insideEsqlQuery) {
          const queryText = requestTextBeforeCursor.slice(esqlQueryIndex);
          const unescapedQuery = unescapeInvalidChars(queryText);
          const esqlSuggestions = await suggest(
            unescapedQuery,
            unescapedQuery.length,
            context,
            esqlCallbacks
          );
          const completionList: monaco.languages.CompletionList = {
            // @ts-expect-error because of range typing: https://github.com/microsoft/monaco-editor/issues/4638
            suggestions: wrapAsMonacoSuggestions(
              esqlSuggestions,
              queryText,
              false,
              !insideTripleQuotes
            ),
          };
          return completionList;
        }
        return delegateToActionsProvider();
      },
    };
  },
};

export const ConsoleOutputLang: LangModuleType = {
  ID: CONSOLE_OUTPUT_LANG_ID,
  lexerRules: consoleOutputLexerRules,
  languageConfiguration: consoleOutputLanguageConfiguration,
  foldingRangeProvider,
};

export type { ParsedRequest } from './types';
export { getParsedRequestsProvider } from './language';
export { ConsoleParsedRequestsProvider } from './console_parsed_requests_provider';

export { createOutputParser } from './output_parser';
