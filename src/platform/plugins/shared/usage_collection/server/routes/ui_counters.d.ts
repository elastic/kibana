import type { IRouter, ISavedObjectsRepository } from '@kbn/core/server';
import type { UsageCountersServiceSetup } from '../usage_counters';
export declare function registerUiCountersRoute(router: IRouter, getSavedObjects: () => ISavedObjectsRepository | undefined, usageCounters: UsageCountersServiceSetup): void;
