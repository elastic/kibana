/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// This file contains a lot of single setup logic for registering a language globally

import { monaco } from '../monaco_imports';
import { WorkerProxyService } from '../ace_migration/worker_proxy';
import { setupWorker } from '../ace_migration/setup_worker';
import { XJsonWorker } from './worker';
import { ID } from './constants';

const OWNER = 'XJSON_GRAMMAR_CHECKER';
const wps = new WorkerProxyService<XJsonWorker>();
monaco.languages.onLanguage(ID, async () => {
  setupWorker(ID, OWNER, wps);
});
