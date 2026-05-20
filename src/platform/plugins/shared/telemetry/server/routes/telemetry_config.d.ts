import { type Observable } from 'rxjs';
import type { IRouter, SavedObjectsClient } from '@kbn/core/server';
import type { TelemetryConfigType } from '../config';
interface RegisterTelemetryConfigRouteOptions {
    router: IRouter;
    config$: Observable<TelemetryConfigType>;
    currentKibanaVersion: string;
    savedObjectsInternalClient$: Observable<SavedObjectsClient>;
}
export declare function registerTelemetryConfigRoutes({ router, config$, currentKibanaVersion, savedObjectsInternalClient$, }: RegisterTelemetryConfigRouteOptions): void;
export {};
