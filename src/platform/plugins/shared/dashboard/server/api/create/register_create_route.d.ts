import type { VersionedRouter } from '@kbn/core-http-server';
import type { RequestHandlerContext } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
export declare function registerCreateRoute(router: VersionedRouter<RequestHandlerContext>, usageCounter: UsageCounter | undefined, isDashboardAppRequest: boolean): void;
