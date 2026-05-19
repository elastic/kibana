import type { SavedObjectConfig } from '@kbn/core-saved-objects-base-server-internal';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { InternalSavedObjectRouter } from '../internal_types';
interface RouteDependencies {
    config: SavedObjectConfig;
    coreUsageData: InternalCoreUsageDataSetup;
}
export declare const registerExportRoute: (router: InternalSavedObjectRouter, { config, coreUsageData }: RouteDependencies) => void;
export {};
