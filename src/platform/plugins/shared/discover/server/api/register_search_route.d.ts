import type { VersionedRouter } from '@kbn/core-http-server';
import type { Logger, RequestHandlerContext } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
export declare const registerSearchRoute: (router: VersionedRouter<RequestHandlerContext>, logger: Logger, usageCounter: UsageCounter | undefined) => void;
