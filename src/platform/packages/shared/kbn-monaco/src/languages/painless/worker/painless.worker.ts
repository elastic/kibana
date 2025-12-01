/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// This module is intended to be run inside of a webworker
/* eslint-disable @kbn/eslint/module_migration */

import '@babel/runtime/regenerator';
// @ts-ignore
// Monaco 0.54.0: Use editor.worker.start directly instead of editor.worker's initialize()
// wrapper, which no longer supports the SimpleWorkerServer pattern used in 0.44.0
import * as worker from 'monaco-editor/esm/vs/editor/editor.worker.start';
import type { monaco } from '../../../monaco_imports';
import { PainlessWorker } from './painless_worker';

self.onmessage = () => {
  worker.start((ctx: monaco.worker.IWorkerContext) => {
    return new PainlessWorker(ctx);
  });
};
