/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { monaco } from '@kbn/monaco';
import { CssLang, HandlebarsLang, LangModuleType } from './languages';

function registerLanguage(language: LangModuleType) {
  monaco.languages.register({
    id: language.ID,
  });
  monaco.languages.setMonarchTokensProvider(language.ID, language.language);
  monaco.languages.setLanguageConfiguration(language.ID, language.conf);
}

registerLanguage(CssLang);
registerLanguage(HandlebarsLang);
