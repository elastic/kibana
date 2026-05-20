import type { Observable } from 'rxjs';
import type { IRouter, Logger, SavedObjectsClient } from '@kbn/core/server';
import type { TelemetryCollectionManagerPluginSetup } from '@kbn/telemetry-collection-manager-plugin/server';
import type { TelemetryConfigType } from '../config';
import { type SecurityGetter } from './telemetry_usage_stats';
interface RegisterRoutesParams {
    isDev: boolean;
    logger: Logger;
    config$: Observable<TelemetryConfigType>;
    currentKibanaVersion: string;
    router: IRouter;
    telemetryCollectionManager: TelemetryCollectionManagerPluginSetup;
    savedObjectsInternalClient$: Observable<SavedObjectsClient>;
    getSecurity: SecurityGetter;
}
export declare function registerRoutes(options: RegisterRoutesParams): void;
export {};
