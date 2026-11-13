/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_WORKER_ID, LANG_SPECIFIC_WORKER_IDS } from '../worker_entries';

export { DEFAULT_WORKER_ID };
export type { LangSpecificWorkerIds } from '../worker_entries';

const isLangSpecificWorkerId = (
  languageId: string
): languageId is (typeof LANG_SPECIFIC_WORKER_IDS)[number] =>
  LANG_SPECIFIC_WORKER_IDS.some((id) => id === languageId);

const monacoBundleDir = (window as any).__kbnPublicPath__?.['kbn-monaco'];

export const getWorkerUrl = (languageId: string): string => {
  if (!monacoBundleDir) {
    throw new Error('Could not resolve Monaco bundle directory');
  }

  const workerId = isLangSpecificWorkerId(languageId) ? languageId : DEFAULT_WORKER_ID;
  return `${monacoBundleDir}${workerId}.editor.worker.js`;
};

export const getWorker = (languageId: string): Worker => {
  const workerUrl = getWorkerUrl(languageId);
  return new Worker(workerUrl, { name: languageId, type: 'classic' });
};
