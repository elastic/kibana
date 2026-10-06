import type { RouteAccess, RouteDeprecationInfo } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { SavedObjectConfig } from '@kbn/core-saved-objects-base-server-internal';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { InternalSavedObjectRouter } from '../internal_types';
interface RouteDependencies {
    config: SavedObjectConfig;
    coreUsageData: InternalCoreUsageDataSetup;
    logger: Logger;
    access: RouteAccess;
    deprecationInfo: RouteDeprecationInfo;
}
export declare const registerUpdateRoute: (router: InternalSavedObjectRouter, { config, coreUsageData, logger, access, deprecationInfo }: RouteDependencies) => void;
export {};
