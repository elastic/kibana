import type { ISavedObjectsRepository } from '@kbn/core/server';
import type { ReportSchemaType } from './schema';
import { type UsageCountersServiceSetup } from '../usage_counters';
export declare function storeUiReport(internalRepository: ISavedObjectsRepository, usageCounters: UsageCountersServiceSetup, report: ReportSchemaType): Promise<[...PromiseSettledResult<void | import("@kbn/core/public").SavedObject<unknown> | import("@kbn/core/public").SavedObject<{
    count: number;
}>>[], PromiseSettledResult<PromiseSettledResult<import("@kbn/core/public").SavedObject<{
    appId: string;
    viewId: string;
    timestamp: string;
}>>[] | undefined>]>;
