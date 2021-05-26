/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Lang as CssLang } from './css';
import { Lang as HandlebarsLang } from './handlebars';
import { Lang as MarkdownHandlebarsLang } from './markdown_handlebars';
import { LangModule as LangModuleType } from './types';
import { registerLanguage } from './helpers';

export { CssLang, HandlebarsLang, MarkdownHandlebarsLang, LangModuleType, registerLanguage };
