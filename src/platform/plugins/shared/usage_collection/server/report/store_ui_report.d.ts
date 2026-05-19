import type { ISavedObjectsRepository } from '@kbn/core/server';
import type { ReportSchemaType } from './schema';
import { type UsageCountersServiceSetup } from '../usage_counters';
export declare function storeUiReport(internalRepository: ISavedObjectsRepository, usageCounters: UsageCountersServiceSetup, report: ReportSchemaType): Promise<[...PromiseSettledResult<void | import("@kbn/core/packages/saved-objects/common").SavedObject<unknown> | import("@kbn/core/packages/saved-objects/common").SavedObject<{
    count: number;
}>>[], PromiseSettledResult<PromiseSettledResult<import("@kbn/core/packages/saved-objects/common").SavedObject<{
    appId: string;
    viewId: string;
    timestamp: string;
}>>[] | undefined>]>;
