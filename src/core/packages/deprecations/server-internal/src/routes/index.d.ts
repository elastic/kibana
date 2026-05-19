import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { Logger } from '@kbn/logging';
export declare function registerRoutes({ http, coreUsageData, logger, }: {
    http: InternalHttpServiceSetup;
    coreUsageData: InternalCoreUsageDataSetup;
    logger: Logger;
}): void;
