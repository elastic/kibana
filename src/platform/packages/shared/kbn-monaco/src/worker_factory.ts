/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ID as XJSON_LANG_ID } from './languages/xjson/constants';
import { ID as PAINLESS_LANG_ID } from './languages/painless/constants';
import { CONSOLE_LANG_ID } from './languages/console/constants';
import { ID as YAML_LANG_ID } from './languages/yaml/constants';
import { monaco } from './monaco_imports';

export const DEFAULT_WORKER_ID = 'default' as const;

const langSpecificWorkerIds = [
  monaco.languages.json.jsonDefaults.languageId,
  XJSON_LANG_ID,
  PAINLESS_LANG_ID,
  YAML_LANG_ID,
  CONSOLE_LANG_ID,
] as const;

// exported for use in webpack config to build workers
export type LangSpecificWorkerIds = [typeof DEFAULT_WORKER_ID, ...typeof langSpecificWorkerIds];

const monacoBundleDir = (window as any).__kbnPublicPath__?.['kbn-monaco'];

export const getWorkerUrl = (languageId: string): string => {
  if (!monacoBundleDir) {
    return '';
  }

  const workerId = langSpecificWorkerIds.includes(languageId) ? languageId : DEFAULT_WORKER_ID;
  return `${monacoBundleDir}${workerId}.editor.worker.js`;
};

export const getWorker = (languageId: string): Worker => {
  const workerUrl = getWorkerUrl(languageId);
  if (!workerUrl) {
    throw new Error('MonacoEnvironment.getWorkerUrl is not defined');
  }
  return new Worker(workerUrl, { name: languageId, type: 'module' });
};
