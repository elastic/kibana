import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import type { UsageCountersSearchParams, UsageCountersSearchResult } from '../types';
export declare function searchUsageCounters(repository: ISavedObjectsRepository, params: UsageCountersSearchParams): Promise<UsageCountersSearchResult>;
