/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const DEFAULT_WORKER_ID = 'default' as const;

/** Language ids that get their own worker. `json` matches Monaco's built-in JSON language id. */
export const LANG_SPECIFIC_WORKER_IDS = ['json', 'xjson', 'painless', 'yaml', 'console'] as const;

export type LangSpecificWorkerIds = [typeof DEFAULT_WORKER_ID, ...typeof LANG_SPECIFIC_WORKER_IDS];

export type MonacoWorkerId = LangSpecificWorkerIds[number];

/**
 * Rspack entry requests for each worker. Paths under `src/` are relative to this package.
 * Node module requests are left as-is.
 */
export const MONACO_WORKER_ENTRIES: Record<MonacoWorkerId, string> = {
  default: 'monaco-editor/esm/vs/editor/editor.worker.js',
  json: 'monaco-editor/esm/vs/language/json/json.worker.js',
  xjson: 'src/languages/xjson/worker/xjson.worker.ts',
  painless: 'src/languages/painless/worker/painless.worker.ts',
  yaml: 'src/languages/yaml/worker/yaml.worker.ts',
  console: 'src/languages/console/worker/console.worker.ts',
};
