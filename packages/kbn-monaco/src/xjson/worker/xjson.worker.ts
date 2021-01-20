/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// Please note: this module is intended to be run inside of a webworker.
/* eslint-disable @kbn/eslint/module_migration */

import 'regenerator-runtime/runtime';
// @ts-ignore
import * as worker from 'monaco-editor/esm/vs/editor/editor.worker';
import { XJsonWorker } from './xjson_worker';

self.onmessage = () => {
  worker.initialize((ctx: any, createData: any) => {
    return new XJsonWorker(ctx);
  });
};
