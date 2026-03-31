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
import './language';

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
import { checkForTripleQuotesAndEsqlQuery, unescapeInvalidChars } from './utils';

export { CONSOLE_LANG_ID, CONSOLE_OUTPUT_LANG_ID } from './constants';
/**
 * export the theme id for the console language
 */
export { CONSOLE_THEME_ID } from './language';

export const CONSOLE_TRIGGER_CHARS = ['/', '.', '_', ',', '?', '=', '&', '"'];

const requestMethodRe = /^\s*(GET|POST|PUT|DELETE|HEAD|PATCH)\b/i;
const esqlRequestLineRe = /^\s*post\s+\/?_query(?:\/async)?(?:\s|\?|$)/i;
/**
 * Safeguards for request-line lookup. We scan backwards from the cursor until we find the nearest
 * request method line (GET/POST/...), but we cap the amount of work to avoid a potentially large
 * number of `getLineContent()` calls on very long documents.
 *
 * If these limits are hit, ES|QL context detection is skipped and we fall back to the
 * actions provider (preserving completion behavior, just without ES|QL suggestions).
 */
const MAX_REQUEST_LINE_LOOKBACK_LINES = 2000;
const MAX_REQUEST_LINE_LOOKBACK_CHARS = 100_000;

const findEsqlRequestLineNumber = (
  model: monaco.editor.ITextModel,
  positionLineNumber: number
): number | undefined => {
  for (
    let lineNumber = positionLineNumber, scannedLines = 0, scannedChars = 0;
    lineNumber >= 1 &&
    scannedLines < MAX_REQUEST_LINE_LOOKBACK_LINES &&
    scannedChars < MAX_REQUEST_LINE_LOOKBACK_CHARS;
    lineNumber--, scannedLines++
  ) {
    const line = model.getLineContent(lineNumber);
    scannedChars += line.length + 1;
    if (requestMethodRe.test(line)) {
      // Only treat this as an ES|QL request if the request line matches POST _query(/async)?...
      return esqlRequestLineRe.test(line) ? lineNumber : undefined;
    }
  }

  return undefined;
};

const getRequestTextBeforeCursor = (
  model: monaco.editor.ITextModel,
  requestLineNumber: number,
  position: monaco.Position
): string => {
  return model.getValueInRange({
    startLineNumber: requestLineNumber,
    startColumn: 1,
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
        // expensive for large inputs (like pasted JSON with huge string fields). We only do ES|QL
        // context detection when the cursor is within a POST /_query request.
        const delegateToActionsProvider = () => {
          const actions = actionsProvider.current;
          return (
            actions?.provideCompletionItems(model, position, context, token) ?? {
              suggestions: [],
            }
          );
        };

        const esqlRequestLineNumber = findEsqlRequestLineNumber(model, position.lineNumber);
        if (!esqlRequestLineNumber) {
          return delegateToActionsProvider();
        }

        const requestTextBeforeCursor = getRequestTextBeforeCursor(
          model,
          esqlRequestLineNumber,
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
