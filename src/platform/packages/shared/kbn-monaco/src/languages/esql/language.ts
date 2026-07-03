/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esqlFunctionNames } from '@kbn/esql-language/src/commands/definitions/generated/function_names';
import { monarch } from '@elastic/monaco-esql';
import * as monarchDefinitions from '@elastic/monaco-esql/lib/definitions';
import { PromQLLang } from '../promql';
import { monaco } from '../../monaco_imports';
import type { CustomLangModuleType } from '../../types';
import { ESQL_LANG_ID } from './lib/constants';
import { buildEsqlTheme } from './lib/theme';
import {
  ESQL_AUTOCOMPLETE_TRIGGER_CHARS,
  esqlValidate,
  getCodeActionProvider,
  getDocumentHighlightProvider,
  getHoverProvider,
  getInlineCompletionsProvider,
  getSignatureProvider,
  getSuggestionProvider,
} from './lib/providers';
import type { ESQLDependencies, MonacoMessage } from './lib/providers';

export { ESQL_AUTOCOMPLETE_TRIGGER_CHARS };
export type { ESQLDependencies, MonacoMessage };

export const ESQLLang: CustomLangModuleType<ESQLDependencies, MonacoMessage> = {
  ID: ESQL_LANG_ID,
  async onLanguage() {
    // PromQL can be embedded in ES|QL querys.
    // We need to manually trigger its language loading for it to work.
    await PromQLLang.onLanguage?.();

    const language = monarch.create({
      ...monarchDefinitions,
      functions: esqlFunctionNames,
    });

    monaco.languages.setMonarchTokensProvider(ESQL_LANG_ID, language);
  },
  languageThemeResolver: buildEsqlTheme,
  languageConfiguration: {
    brackets: [
      ['(', ')'],
      ['[', ']'],
    ],
    autoClosingPairs: [
      { open: '(', close: ')' },
      { open: '[', close: ']' },
      { open: `'`, close: `'` },
      { open: '"""', close: '"""' },
      { open: '"', close: '"' },
    ],
    surroundingPairs: [
      { open: '(', close: ')' },
      { open: `'`, close: `'` },
      { open: '"""', close: '"""' },
      { open: '"', close: '"' },
    ],
  },
  validate: esqlValidate,
  getCodeActionProvider,
  getHoverProvider,
  getInlineCompletionsProvider,
  getSuggestionProvider,
  getSignatureProvider,
  getDocumentHighlightProvider,
};
