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
import * as worker from 'monaco-editor/esm/vs/editor/editor.worker';

import { monaco } from '../../monaco_imports';
import { ESQLWorker } from './esql_worker';

self.onmessage = () => {
  worker.initialize((ctx: monaco.worker.IWorkerContext, createData: any) => {
    return new ESQLWorker(ctx);
  });
};
