import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { RouterDeprecatedApiDetails } from '@kbn/core-http-server';
import type { CoreDeprecatedApiUsageStats } from '@kbn/core-usage-data-server';
import type { DocLinksServiceSetup } from '@kbn/core-doc-links-server';
import type { DeprecationsFactory } from '../../deprecations_factory';
export interface ApiDeprecationsServiceDeps {
    deprecationsFactory: DeprecationsFactory;
    http: InternalHttpServiceSetup;
    coreUsageData: InternalCoreUsageDataSetup;
    docLinks: DocLinksServiceSetup;
}
export interface BuildApiDeprecationDetailsParams {
    apiUsageStats: CoreDeprecatedApiUsageStats;
    deprecatedApiDetails: RouterDeprecatedApiDetails;
    docLinks: DocLinksServiceSetup;
}
