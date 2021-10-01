/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * This import registers the XJSON monaco language contribution
 */
import './language';
import { ID } from './constants';
import { lexerRules, languageConfiguration } from './lexer_rules';
import { LangModule as LangModuleType } from '../types';

export const XJsonLang: LangModuleType = { ID, lexerRules, languageConfiguration };
