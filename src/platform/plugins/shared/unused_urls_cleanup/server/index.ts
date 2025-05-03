/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext } from '@kbn/core/server';

export type { UnusedUrlsCleanupPluginSetup, UnusedUrlsCleanupPluginStart } from './types';
export type { UnusedUrlsCleanupPluginConfig } from './config';
export { config, configSchema } from './config';
export {
  TASK_ID,
  TASK_SCHEDULE_INTERVAL,
  SAVED_OBJECT_TYPE,
  PIT_KEEP_ALIVE,
  MAX_PAGE_SIZE,
  DEFAULT_MAX_AGE,
  DELETE_UNUSED_URLS_TASK,
} from './constants';

export async function plugin(initializerContext: PluginInitializerContext) {
  const { UnusedUrlsCleanupPlugin } = await import('./plugin');
  return new UnusedUrlsCleanupPlugin(initializerContext);
}
