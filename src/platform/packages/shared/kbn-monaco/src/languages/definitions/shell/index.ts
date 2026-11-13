/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '../../../monaco_imports';
import type { LangModuleType } from '../../../types';
import { getShellSuggestionProvider } from './completion';
import { ID } from './constants';
import { languageConfiguration, lexerRules } from './language';

export { ID as SHELL_LANG_ID } from './constants';

export const ShellLang: LangModuleType = {
  ID,
  lexerRules,
  languageConfiguration,
  onLanguage: () => {
    monaco.languages.registerCompletionItemProvider(ID, getShellSuggestionProvider());
  },
};
