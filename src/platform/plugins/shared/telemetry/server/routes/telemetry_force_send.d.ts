import type { Logger } from '@kbn/logging';
import type { IRouter } from '@kbn/core/server';
import type { TelemetryCollectionManagerPluginSetup } from '@kbn/telemetry-collection-manager-plugin/server';
import { type Observable } from 'rxjs';
import type { TelemetryConfigType } from '../config';
export interface RegisterTelemetryForceSendParams {
    logger: Logger;
    config$: Observable<TelemetryConfigType>;
    currentKibanaVersion: string;
    router: IRouter;
    telemetryCollectionManager: TelemetryCollectionManagerPluginSetup;
}
export declare function registerTelemetryForceSend({ config$, currentKibanaVersion, router, telemetryCollectionManager, }: RegisterTelemetryForceSendParams): void;
