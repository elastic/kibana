/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ESQLWorker } from './worker/esql_worker';
import { buildESQlTheme } from './lib/monaco/esql_theme';
import { ID, ESQL_THEME_ID } from './constants';

import type { LangModuleType, WorkerAccessor } from '../types';

import { monaco } from '../monaco_imports';
import { DiagnosticsAdapter, WorkerProxyService } from '../common';

const getTokenProviderAsync = async () => {
  const { ESQLTokensProvider } = await import('./lib/monaco');

  return new ESQLTokensProvider();
};

let diagnosticsAdapter: DiagnosticsAdapter;

const workerProxyService = new WorkerProxyService<ESQLWorker>();

const worker: WorkerAccessor<ESQLWorker> = (...uris: monaco.Uri[]): Promise<ESQLWorker> => {
  return workerProxyService.getWorker(uris);
};

export const ESQLLang: LangModuleType = {
  ID,
  getSyntaxErrors: () => {
    // @todo: to debug
  },
  onLanguage() {
    workerProxyService.setup(ID);

    monaco.editor.defineTheme(ESQL_THEME_ID, buildESQlTheme());

    monaco.languages.setTokensProvider(ID, getTokenProviderAsync());

    monaco.editor.createWebWorker({ label: ID, moduleId: '' });

    diagnosticsAdapter = new DiagnosticsAdapter(ID, worker);
  },
};

export { ESQL_THEME_ID };
