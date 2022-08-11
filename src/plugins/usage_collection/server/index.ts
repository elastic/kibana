/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from '@kbn/core/server';
import { UsageCollectionPlugin } from './plugin';

export type {
  Collector,
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
  SerializeCounterParams,
} from './usage_counters';

export { USAGE_COUNTERS_SAVED_OBJECT_TYPE, serializeCounterKey } from './usage_counters';

export type { UsageCollectionSetup } from './plugin';
export { config } from './config';
export const plugin = (initializerContext: PluginInitializerContext) =>
  new UsageCollectionPlugin(initializerContext);
