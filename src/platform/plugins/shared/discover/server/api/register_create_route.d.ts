import type { VersionedRouter } from '@kbn/core-http-server';
import type { CoreSetup, Logger, RequestHandlerContext } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
export declare const registerCreateRoute: (router: VersionedRouter<RequestHandlerContext>, userActivity: CoreSetup["userActivity"], logger: Logger, usageCounter: UsageCounter | undefined) => void;
