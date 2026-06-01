import type { RequestHandlerContext, Logger } from '@kbn/core/server';
import type { SampleDatasetSchema } from '../lib/sample_dataset_registry_types';
import { SampleDataInstaller } from '../sample_data_installer';
export declare const SAMPLE_DATA_INSTALLED_EVENT = "sample_data_installed";
export declare const SAMPLE_DATA_UNINSTALLED_EVENT = "sample_data_uninstalled";
export declare const getSampleDataInstaller: ({ datasetId, context, sampleDatasets, logger, }: {
    datasetId: string;
    context: RequestHandlerContext;
    sampleDatasets: SampleDatasetSchema[];
    logger: Logger;
}) => Promise<SampleDataInstaller>;
export declare const getSavedObjectsClient: (context: RequestHandlerContext, objectTypes: string[]) => Promise<import("@kbn/core/server").SavedObjectsClientContract>;
