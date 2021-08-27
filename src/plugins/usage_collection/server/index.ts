/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { PluginInitializerContext } from '../../../core/server/plugins/types';
import { UsageCollectionPlugin } from './plugin';

export type {
  AllowedSchemaTypes,
  Collector,
  CollectorFetchContext,
  CollectorFetchMethod,
  CollectorOptions,
  CollectorOptionsFetchExtendedContext,
  MakeSchemaFrom,
  UsageCollectorOptions,
} from './collector';
export { config } from './config';
export type { UsageCollectionSetup } from './plugin';
export { serializeCounterKey, USAGE_COUNTERS_SAVED_OBJECT_TYPE } from './usage_counters';
export type {
  IncrementCounterParams,
  SerializeCounterParams,
  UsageCounter,
  UsageCountersSavedObject,
  UsageCountersSavedObjectAttributes,
} from './usage_counters';

export const plugin = (initializerContext: PluginInitializerContext) =>
  new UsageCollectionPlugin(initializerContext);
