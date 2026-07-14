import type { RouterDeprecatedApiDetails } from '@kbn/core-http-server';
import type { CoreDeprecatedApiUsageStats } from '@kbn/core-usage-data-server';
import type { DeprecationDetailsMessage } from '@kbn/core-deprecations-common';
import type { DocLinksServiceSetup } from '@kbn/core-doc-links-server';
export declare const getApiDeprecationTitle: (details: RouterDeprecatedApiDetails) => string;
export declare const getApiDeprecationMessage: (details: RouterDeprecatedApiDetails, apiUsageStats: CoreDeprecatedApiUsageStats, docLinks: DocLinksServiceSetup) => Array<string | DeprecationDetailsMessage>;
export declare const getApiDeprecationsManualSteps: (details: RouterDeprecatedApiDetails) => string[];
