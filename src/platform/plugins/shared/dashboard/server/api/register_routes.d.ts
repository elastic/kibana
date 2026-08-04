import type { HttpServiceSetup, Logger } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
export declare function registerRoutes(http: HttpServiceSetup, usageCounter: UsageCounter | undefined, logger: Logger): void;
