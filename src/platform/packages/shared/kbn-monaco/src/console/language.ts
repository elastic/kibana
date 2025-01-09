/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setupConsoleErrorsProvider } from './console_errors_provider';
import { ConsoleWorkerProxyService } from './console_worker_proxy';
import { monaco } from '../monaco_imports';
import { CONSOLE_LANG_ID } from './constants';
import { ConsoleParsedRequestsProvider } from './console_parsed_requests_provider';
import { buildConsoleTheme } from './theme';

const workerProxyService = new ConsoleWorkerProxyService();

export const getParsedRequestsProvider = (model: monaco.editor.ITextModel | null) => {
  return new ConsoleParsedRequestsProvider(workerProxyService, model);
};

// Theme id is the same as lang id, as we register only one theme resolver that's color mode aware
export const CONSOLE_THEME_ID = CONSOLE_LANG_ID;
monaco.editor.registerLanguageThemeResolver(CONSOLE_THEME_ID, buildConsoleTheme);

monaco.languages.onLanguage(CONSOLE_LANG_ID, async () => {
  workerProxyService.setup();
  setupConsoleErrorsProvider(workerProxyService);
});
