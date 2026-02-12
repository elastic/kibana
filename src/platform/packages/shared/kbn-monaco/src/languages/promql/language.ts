/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { promLanguageDefinition } from 'monaco-promql';
import type { LangModuleType } from '../../types';
import { monaco } from '../../monaco_imports';

export const PROMQL_LANG_ID = 'promql' as const;

export const PromQLLang: LangModuleType = {
  ID: PROMQL_LANG_ID,
  async onLanguage() {
    const promQL = await promLanguageDefinition.loader();
    monaco.languages.setMonarchTokensProvider(PROMQL_LANG_ID, promQL.language);
    monaco.languages.setLanguageConfiguration(PROMQL_LANG_ID, promQL.languageConfiguration);
  },
};
