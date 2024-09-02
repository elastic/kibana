/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from '@kbn/core/server';

export type {
  Collector,
  ICollectorSet,
  AllowedSchemaTypes,
  MakeSchemaFrom,
  CollectorOptions,
  UsageCollectorOptions,
  CollectorFetchContext,
  CollectorFetchMethod,
} from './collector';

export type {
  UsageCountersSavedObject,
  UsageCountersSavedObjectAttributes,
  IncrementCounterParams,
  UsageCounter,
} from './usage_counters';

export { serializeCounterKey, USAGE_COUNTERS_SAVED_OBJECT_TYPE } from './usage_counters';

export type { UsageCollectionSetup, UsageCollectionStart } from './plugin';
export { config } from './config';
export const plugin = async (initializerContext: PluginInitializerContext) => {
  const { UsageCollectionPlugin } = await import('./plugin');
  return new UsageCollectionPlugin(initializerContext);
};
