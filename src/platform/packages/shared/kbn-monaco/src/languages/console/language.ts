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
import { setupConsoleErrorsProvider } from './console_errors_provider';
import { ConsoleWorkerProxyService } from './console_worker_proxy';
import { monaco } from '../../monaco_imports';
import { CONSOLE_LANG_ID, CONSOLE_OUTPUT_LANG_ID } from './constants';
import { ESQL_AUTOCOMPLETE_TRIGGER_CHARS } from '../esql';
import { wrapAsMonacoSuggestions } from '../esql/lib/converters/suggestions';
import { ConsoleParsedRequestsProvider } from './console_parsed_requests_provider';
import { buildConsoleTheme } from './theme';
import { checkForTripleQuotesAndQueries, unescapeInvalidChars } from './utils';
import type { LangModuleType } from '../../types';

const workerProxyService = new ConsoleWorkerProxyService();

import {
  lexerRules,
  languageConfiguration,
  consoleOutputLexerRules,
  consoleOutputLanguageConfiguration,
} from './lexer_rules';
import { foldingRangeProvider } from './folding_range_provider';

export const CONSOLE_TRIGGER_CHARS = ['/', '.', '_', ',', '?', '=', '&', '"'];

/**
 * @description This language definition is used for the console input panel
 */
export const ConsoleLang: LangModuleType = {
  ID: CONSOLE_LANG_ID,
  lexerRules,
  languageConfiguration,
  foldingRangeProvider,
  onLanguage: () => {
    workerProxyService.setup();
    setupConsoleErrorsProvider(workerProxyService);
  },
  languageThemeResolver: buildConsoleTheme,
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

/**
 * @description This language definition is used for the console output panel
 */
export const ConsoleOutputLang: LangModuleType = {
  ID: CONSOLE_OUTPUT_LANG_ID,
  lexerRules: consoleOutputLexerRules,
  languageConfiguration: consoleOutputLanguageConfiguration,
  foldingRangeProvider,
};

// Theme id is the same as lang id, as we register only one theme resolver that's color mode aware
export const CONSOLE_THEME_ID = CONSOLE_LANG_ID;

// console output theme is the same as console theme
export const CONSOLE_OUTPUT_THEME_ID = CONSOLE_THEME_ID;

export const getParsedRequestsProvider = (model: monaco.editor.ITextModel | null) => {
  return new ConsoleParsedRequestsProvider(workerProxyService, model);
};
