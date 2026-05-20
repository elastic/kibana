import type { UsageCollectionSetup, UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { MetricsTracker } from '../types';
export declare const createUsageTracker: (usageCollection?: UsageCollectionSetup | UsageCollectionStart) => MetricsTracker;
