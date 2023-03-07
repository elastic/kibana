/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '../monaco_imports';

import { ESQL_LANG_ID } from './lib/constants';

import type { CustomLangModuleType } from '../types';
import type { ESQLWorker } from './worker/esql_worker';

import { DiagnosticsAdapter } from '../common/diagnostics_adapter';
import { WorkerProxyService } from '../common/worker_proxy';
import { ESQLCompletionAdapter } from './lib/monaco/esql_completion_provider';
import type { ESQLCustomAutocompleteCallbacks } from './lib/autocomplete/types';

const workerProxyService = new WorkerProxyService<ESQLWorker>();

export const ESQLLang: CustomLangModuleType = {
  ID: ESQL_LANG_ID,
  async onLanguage() {
    const { ESQLTokensProvider } = await import('./lib/monaco');

    workerProxyService.setup(ESQL_LANG_ID);

    monaco.languages.setTokensProvider(ESQL_LANG_ID, new ESQLTokensProvider());

    new DiagnosticsAdapter(ESQL_LANG_ID, (...uris) => workerProxyService.getWorker(uris));
  },

  getSuggestionProvider(callbacks?: ESQLCustomAutocompleteCallbacks) {
    return new ESQLCompletionAdapter((...uris) => workerProxyService.getWorker(uris), callbacks);
  },
};
