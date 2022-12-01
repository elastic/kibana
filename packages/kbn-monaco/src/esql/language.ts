/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '../monaco_imports';

import { buildESQlTheme } from './lib/monaco/esql_theme';
import { ESQL_LANG_ID, ESQL_THEME_ID } from './constants';

import type { LangModuleType } from '../types';
import type { ESQLWorker } from './worker/esql_worker';

import { DiagnosticsAdapter } from '../common/diagnostics_adapter';
import { WorkerProxyService } from '../common/worker_proxy';

export const ESQLLang: LangModuleType = {
  ID: ESQL_LANG_ID,
  customTheme: {
    ID: ESQL_THEME_ID,
    themeData: buildESQlTheme(),
  },
  async onLanguage() {
    const { ESQLTokensProvider } = await import('./lib/monaco');
    const workerProxyService = new WorkerProxyService<ESQLWorker>();

    workerProxyService.setup(ESQL_LANG_ID);

    monaco.languages.setTokensProvider(ESQL_LANG_ID, new ESQLTokensProvider());

    new DiagnosticsAdapter(ESQL_LANG_ID, (...uris) => workerProxyService.getWorker(uris));
  },
};
