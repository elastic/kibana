/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { registerLanguage } from '@kbn/monaco';
import { Lang as CssLang } from './languages/css';
import { Lang as HandlebarsLang } from './languages/handlebars';
import { Lang as MarkdownLang } from './languages/markdown';
import { Lang as YamlLang } from './languages/yaml';

registerLanguage(CssLang);
registerLanguage(HandlebarsLang);
registerLanguage(MarkdownLang);
registerLanguage(YamlLang);
