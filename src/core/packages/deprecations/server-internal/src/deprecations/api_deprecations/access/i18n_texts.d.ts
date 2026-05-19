import type { RouterDeprecatedApiDetails } from '@kbn/core-http-server';
import type { CoreDeprecatedApiUsageStats } from '@kbn/core-usage-data-server';
import type { DocLinksServiceSetup } from '@kbn/core-doc-links-server';
import type { DeprecationDetailsMessage } from '@kbn/core-deprecations-common';
export declare const getApiDeprecationTitle: (details: Pick<RouterDeprecatedApiDetails, "routePath" | "routeMethod">) => string;
export declare const getApiDeprecationMessage: (details: Pick<RouterDeprecatedApiDetails, "routePath" | "routeMethod" | "routeDeprecationOptions">, apiUsageStats: CoreDeprecatedApiUsageStats, docLinks: DocLinksServiceSetup) => Array<string | DeprecationDetailsMessage>;
export declare const getApiDeprecationsManualSteps: () => string[];
