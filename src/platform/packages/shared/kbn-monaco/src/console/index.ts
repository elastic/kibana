/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This import registers the Console monaco language contribution
 */
import './language';

import type { LangModuleType } from '../types';
import { CONSOLE_LANG_ID, CONSOLE_OUTPUT_LANG_ID } from './constants';
import {
  lexerRules,
  languageConfiguration,
  consoleOutputLexerRules,
  consoleOutputLanguageConfiguration,
} from './lexer_rules';
import { foldingRangeProvider } from './folding_range_provider';

export { CONSOLE_LANG_ID, CONSOLE_OUTPUT_LANG_ID, CONSOLE_THEME_ID } from './constants';

export { buildConsoleTheme } from './theme';

export const ConsoleLang: LangModuleType = {
  ID: CONSOLE_LANG_ID,
  lexerRules,
  languageConfiguration,
  foldingRangeProvider,
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
