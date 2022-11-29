/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildESQlTheme } from './lib/monaco/esql_theme';
import { ID, ESQL_THEME_ID } from './constants';

import type { LangModuleType } from '../types';

export const ESQLLang: LangModuleType = {
  ID,
  tokensProvider: async () => {
    const { ESQLTokensProvider } = await import('./lib/monaco');

    return new ESQLTokensProvider();
  },
  customTheme: {
    ID: ESQL_THEME_ID,
    themeData: buildESQlTheme(),
  },
};

export { ESQL_THEME_ID };
