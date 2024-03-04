/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ConsoleWorker } from './worker';
import { WorkerProxyService } from '../ace_migration/worker_proxy';
import { monaco } from '../monaco_imports';
import { CONSOLE_LANG_ID } from './constants';
import { setupWorker } from '../ace_migration/setup_worker';

const OWNER = 'CONSOLE_GRAMMAR_CHECKER';
const wps = new WorkerProxyService<ConsoleWorker>();
monaco.languages.onLanguage(CONSOLE_LANG_ID, async () => {
  setupWorker(CONSOLE_LANG_ID, OWNER, wps);
});
