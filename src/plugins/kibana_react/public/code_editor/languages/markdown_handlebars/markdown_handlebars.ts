/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '@kbn/monaco';
import { HandlebarsLang } from '../';
import { conf as markdownConf, language as markdownLang } from './markdown.d';
import { mergeConfig } from '../helpers';

// creating conf and language, merging two languages rules. It is possible,
// because 'handlebars' and 'markdown' syntax are not against each other.
export const conf: monaco.languages.LanguageConfiguration = mergeConfig(
  markdownConf,
  HandlebarsLang.conf
);

export const language: monaco.languages.IMonarchLanguage = mergeConfig(
  markdownLang,
  HandlebarsLang.language
);
