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
import { ESQL_AUTOCOMPLETE_TRIGGER_CHARS, ESQLLang } from '../esql';
import { wrapAsMonacoSuggestions } from '../esql/lib/converters/suggestions';
import { ConsoleParsedRequestsProvider } from './console_parsed_requests_provider';
import { buildConsoleTheme } from './theme';
import {
  checkForTripleQuotesAndEsqlQuery,
  findRequestLineNumber,
  getFallbackRequestStartPosition,
  unescapeInvalidChars,
} from './utils';
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
 * Anchor for the ES|QL context check. A `document`-direction scan is required: the string-aware
 * scanner then sees everything from the document start, so request-like lines *inside* strings
 * can neither activate nor suppress ES|QL suggestions. A partially scanned document has unknown
 * initial string state, so it must not be classified from an untrusted suffix.
 */
const findRequestAnchorLineNumber = (
  model: monaco.editor.ITextModel,
  positionLineNumber: number
): number | undefined => {
  const getLineContent = (lineNumber: number) => model.getLineContent(lineNumber);
  return findRequestLineNumber(getLineContent, positionLineNumber, { direction: 'document' });
};

/**
 * Documents whose above-cursor prefix exceeds the lookback caps cannot be classified from a line
 * scan. Anchor those via the worker's parsed requests instead: the parser is capped-scan
 * independent, and the resolver rejects recovery artifacts inside triple-quoted strings.
 */
const getRequestAnchorPosition = async (
  model: monaco.editor.ITextModel,
  position: monaco.Position
): Promise<monaco.IPosition | undefined> => {
  const anchorLineNumber = findRequestAnchorLineNumber(model, position.lineNumber);
  if (anchorLineNumber !== undefined) {
    return { lineNumber: anchorLineNumber, column: 1 };
  }
  const parsedRequests = await getParsedRequestsProvider(model).getRequests();
  return getFallbackRequestStartPosition(
    parsedRequests,
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
  onLanguage: async () => {
    workerProxyService.setup();
    setupConsoleErrorsProvider(workerProxyService);
    try {
      await ESQLLang.onLanguage();
    } catch {
      // Best-effort: ES|QL is only needed for highlighting/suggestions. Console syntax markers must
      // remain available even if ES|QL fails to load.
    }
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
