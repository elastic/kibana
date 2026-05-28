import type { IRouter, Logger } from '@kbn/core/server';
import type { AppLinkData, SampleDatasetSchema } from '../lib/sample_dataset_registry_types';
export declare const createListRoute: (router: IRouter, sampleDatasets: SampleDatasetSchema[], appLinksMap: Map<string, AppLinkData[]>, logger: Logger) => void;
