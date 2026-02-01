/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCallbacks } from '@kbn/esql-types';
import { suggest } from '@kbn/esql-language';
import type { MutableRefObject } from 'react';
import { setupConsoleErrorsProvider } from './console_errors_provider';
import { ConsoleWorkerProxyService } from './console_worker_proxy';
import type { monaco } from '../../monaco_imports';
import { CONSOLE_LANG_ID, CONSOLE_OUTPUT_LANG_ID } from './constants';
import { ESQL_AUTOCOMPLETE_TRIGGER_CHARS } from '../esql';
import { wrapAsMonacoSuggestions } from '../esql/lib/converters/suggestions';
import { ConsoleParsedRequestsProvider } from './console_parsed_requests_provider';
import { buildConsoleTheme } from './theme';
import { checkForTripleQuotesAndEsqlQuery, unescapeInvalidChars } from './utils';
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

const requestMethodRe = /^\s*(GET|POST|PUT|DELETE|HEAD|PATCH)\b/i;
const esqlRequestLineRe = /^\s*post\s+\/?_query(?:\/async)?(?:\s|\?|$)/i;
const maxLookbackLines = 2000;

const findEsqlRequestLineNumber = (
  model: monaco.editor.ITextModel,
  positionLineNumber: number
): number | undefined => {
  for (
    let lineNumber = positionLineNumber, lookedBack = 0;
    lineNumber >= 1 && lookedBack < maxLookbackLines;
    lineNumber--, lookedBack++
  ) {
    const line = model.getLineContent(lineNumber);
    if (requestMethodRe.test(line)) {
      // Only treat this as an ES|QL request if the request line matches POST _query(/async)?...
      return esqlRequestLineRe.test(line) ? lineNumber : undefined;
    }
  }
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
  onLanguage: () => {
    workerProxyService.setup();
    setupConsoleErrorsProvider(workerProxyService);
  },
  languageThemeResolver: buildConsoleTheme,
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
        // NOTE: `model.getValue()` can be very expensive for large inputs (e.g. pasted JSON with
        // huge string fields). We only do ES|QL context detection for POST /_query requests.
        const delegateToActionsProvider = () => {
          const actions = actionsProvider.current;
          return (
            actions?.provideCompletionItems(model, position, context, token) ?? {
              suggestions: [],
            }
          );
        };

        const requestLineNumber = findEsqlRequestLineNumber(model, position.lineNumber);
        if (!requestLineNumber) {
          return delegateToActionsProvider();
        }

        const requestTextBeforeCursor = getRequestTextBeforeCursor(
          model,
          requestLineNumber,
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
            esqlCallbacks
          );
          return wrapAsMonacoSuggestions(
            esqlSuggestions,
            queryText,
            false,
            !insideTripleQuotes,
            true
          );
        }
        return delegateToActionsProvider();
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
