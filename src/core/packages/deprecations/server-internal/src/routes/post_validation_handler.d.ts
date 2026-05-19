import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-server-internal';
import { type CoreKibanaRequest } from '@kbn/core-http-router-server-internal';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { PostValidationMetadata } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
interface Dependencies {
    coreUsageData: InternalCoreUsageDataSetup;
    http: InternalHttpServiceSetup;
    logger: Logger;
}
/**
 * listens to http post validation events to increment deprecated api calls
 * This will keep track of any called deprecated API.
 */
export declare const registerApiDeprecationsPostValidationHandler: ({ coreUsageData, http, logger, }: Dependencies) => void;
export declare function createRouteDeprecationsHandler({ coreUsageData, logger, }: {
    coreUsageData: InternalCoreUsageDataSetup;
    logger: Logger;
}): (req: CoreKibanaRequest, metadata: PostValidationMetadata) => void;
export {};
