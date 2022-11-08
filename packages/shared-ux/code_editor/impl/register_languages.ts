/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { registerLanguage, LangModuleType } from '@kbn/monaco';
import { lexerRules, languageConfiguration } from '@kbn/monaco/src/xjson/lexer_rules';
import { CssLang, HandlebarsLang, MarkdownLang, YamlLang, HJson } from './languages';

// const LANG =  <Lang, 'css' | 'handlebars' | 'markdown' | 'hjson' | 'markdown' | 'yaml'>; 
// const Lang: LangModuleType = { ID: LANG, lexerRules, languageConfiguration };

registerLanguage(CssLang);
registerLanguage(HandlebarsLang);
registerLanguage(MarkdownLang);
registerLanguage(YamlLang);
registerLanguage(HJson);
