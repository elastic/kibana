import type { HttpServiceSetup, Logger, StartServicesAccessor } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { DataViewsServerPluginStart, DataViewsServerPluginStartDependencies } from './types';
interface RegisterRoutesArgs {
    http: HttpServiceSetup;
    logger: Logger;
    getStartServices: StartServicesAccessor<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>;
    isRollupsEnabled: () => boolean;
    dataViewRestCounter?: UsageCounter;
    hasEsDataTimeout: number;
}
export declare function registerRoutes({ http, logger, getStartServices, isRollupsEnabled, dataViewRestCounter, hasEsDataTimeout, }: RegisterRoutesArgs): void;
export {};
