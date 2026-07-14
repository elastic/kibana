import type { PluginInitializerContext } from '@kbn/core/server';
export type { Collector, ICollectorSet, AllowedSchemaTypes, MakeSchemaFrom, CollectorOptions, UsageCollectorOptions, CollectorFetchContext, CollectorFetchMethod, } from './collector';
export type { UsageCountersSavedObject, UsageCountersSavedObjectAttributes, IncrementCounterParams, UsageCounter, } from './usage_counters';
export { serializeCounterKey, USAGE_COUNTERS_SAVED_OBJECT_TYPE } from './usage_counters';
export type { UsageCollectionSetup, UsageCollectionStart } from './plugin';
export { config } from './config';
export declare const plugin: (initializerContext: PluginInitializerContext) => Promise<import("./plugin").UsageCollectionPlugin>;
