import type { CoreSetup, HttpServiceSetup, Logger } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
export declare const registerRoutes: (http: HttpServiceSetup, userActivity: CoreSetup["userActivity"], logger: Logger, usageCounter: UsageCounter | undefined) => void;
