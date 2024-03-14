/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * This import registers the Console monaco language contribution
 */
import './language';

import type { LangModuleType } from '../types';
import { CONSOLE_LANG_ID } from './constants';
import { lexerRules, languageConfiguration } from './lexer_rules';

export { CONSOLE_LANG_ID, CONSOLE_THEME_ID } from './constants';

export { buildConsoleTheme } from './theme';

export const ConsoleLang: LangModuleType = {
  ID: CONSOLE_LANG_ID,
  lexerRules,
  languageConfiguration,
};
