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
import { checkForTripleQuotesAndQueries, unescapeInvalidChars } from './utils';

export { CONSOLE_LANG_ID, CONSOLE_OUTPUT_LANG_ID } from './constants';
/**
 * export the theme id for the console language
 */
export { CONSOLE_THEME_ID } from './language';

export const CONSOLE_TRIGGER_CHARS = ['/', '.', '_', ',', '?', '=', '&', '"'];

export const ConsoleLang: LangModuleType = {
  ID: CONSOLE_LANG_ID,
  lexerRules,
  languageConfiguration,
  foldingRangeProvider,
  getSuggestionProvider: (
    esqlCallbacks: Pick<ESQLCallbacks, 'getSources' | 'getPolicies'>,
    actionsProvider: MutableRefObject<any>
  ): monaco.languages.CompletionItemProvider => {
    return {
      // force suggestions when these characters are used
      triggerCharacters: [...CONSOLE_TRIGGER_CHARS, ...ESQL_AUTOCOMPLETE_TRIGGER_CHARS],
      provideCompletionItems: async (
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        context: monaco.languages.CompletionContext
      ) => {
        const fullText = model.getValue();
        const cursorOffset = model.getOffsetAt(position);
        const textBeforeCursor = fullText.slice(0, cursorOffset);
        const { insideSingleQuotesQuery, insideTripleQuotesQuery, queryIndex } =
          checkForTripleQuotesAndQueries(textBeforeCursor);
        if (esqlCallbacks && (insideSingleQuotesQuery || insideTripleQuotesQuery)) {
          const queryText = textBeforeCursor.slice(queryIndex, cursorOffset);
          const unescapedQuery = unescapeInvalidChars(queryText);
          const esqlSuggestions = await suggest(
            unescapedQuery,
            unescapedQuery.length,
            context,
            esqlCallbacks
          );
          return {
            suggestions: wrapAsMonacoSuggestions(
              esqlSuggestions,
              queryText,
              false,
              insideSingleQuotesQuery
            ),
          };
        } else if (actionsProvider.current) {
          return actionsProvider.current?.provideCompletionItems(model, position, context);
        }
        return {
          suggestions: [],
        };
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
