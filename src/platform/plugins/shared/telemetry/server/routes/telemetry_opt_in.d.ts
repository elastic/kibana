import { type Observable } from 'rxjs';
import type { IRouter, Logger } from '@kbn/core/server';
import type { TelemetryCollectionManagerPluginSetup } from '@kbn/telemetry-collection-manager-plugin/server';
import type { TelemetryConfigType } from '../config';
interface RegisterOptInRoutesParams {
    currentKibanaVersion: string;
    router: IRouter;
    logger: Logger;
    config$: Observable<TelemetryConfigType>;
    telemetryCollectionManager: TelemetryCollectionManagerPluginSetup;
}
export declare function registerTelemetryOptInRoutes({ config$, logger, router, currentKibanaVersion, telemetryCollectionManager, }: RegisterOptInRoutesParams): void;
export {};
