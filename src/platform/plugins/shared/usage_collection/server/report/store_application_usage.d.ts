import type { ISavedObjectsRepository } from '@kbn/core/server';
import type { ApplicationUsageReport } from './schema';
export declare const storeApplicationUsage: (repository: ISavedObjectsRepository, appUsages: ApplicationUsageReport[], timestamp: Date) => Promise<PromiseSettledResult<import("@kbn/core/packages/saved-objects/common").SavedObject<{
    appId: string;
    viewId: string;
    timestamp: string;
}>>[] | undefined>;
