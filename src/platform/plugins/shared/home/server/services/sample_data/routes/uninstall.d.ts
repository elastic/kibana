import type { IRouter, Logger } from '@kbn/core/server';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type { SampleDatasetSchema } from '../lib/sample_dataset_registry_types';
import type { SampleDataUsageTracker } from '../usage/usage';
export declare function createUninstallRoute(router: IRouter, sampleDatasets: SampleDatasetSchema[], logger: Logger, usageTracker: SampleDataUsageTracker, analytics: AnalyticsServiceSetup): void;
