/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from './monaco_imports';
export declare const DEFAULT_WORKER_ID: 'default';
declare const langSpecificWorkerIds: readonly [string, 'xjson', 'painless', 'yaml', 'console'];
export type LangSpecificWorkerIds = [typeof DEFAULT_WORKER_ID, ...typeof langSpecificWorkerIds];
declare module 'monaco-editor/esm/vs/editor/editor.api' {
  interface Environment {
    monaco: typeof monaco;
  }
}
export {};
