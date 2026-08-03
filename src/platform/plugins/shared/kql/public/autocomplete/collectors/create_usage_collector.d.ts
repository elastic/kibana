import type { StartServicesAccessor } from '@kbn/core/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { AutocompleteUsageCollector } from './types';
export declare const createUsageCollector: (getStartServices: StartServicesAccessor, usageCollection?: UsageCollectionSetup) => AutocompleteUsageCollector;
