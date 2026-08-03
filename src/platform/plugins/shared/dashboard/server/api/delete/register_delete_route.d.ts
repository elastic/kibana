import type { VersionedRouter } from '@kbn/core-http-server';
import type { Logger, RequestHandlerContext } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
export declare function registerDeleteRoute(router: VersionedRouter<RequestHandlerContext>, usageCounter: UsageCounter | undefined, logger: Logger): void;
