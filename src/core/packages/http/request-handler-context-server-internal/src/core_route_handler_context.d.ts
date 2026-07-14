import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { CoreElasticsearchRouteHandlerContext, type InternalElasticsearchServiceStart } from '@kbn/core-elasticsearch-server-internal';
import { CoreSavedObjectsRouteHandlerContext, type InternalSavedObjectsServiceStart } from '@kbn/core-saved-objects-server-internal';
import { CoreDeprecationsRouteHandlerContext, type InternalDeprecationsServiceStart } from '@kbn/core-deprecations-server-internal';
import { CoreUiSettingsRouteHandlerContext, type InternalUiSettingsServiceStart } from '@kbn/core-ui-settings-server-internal';
import { CoreSecurityRouteHandlerContext, type InternalSecurityServiceStart } from '@kbn/core-security-server-internal';
import { CoreUserProfileRouteHandlerContext, type InternalUserProfileServiceStart } from '@kbn/core-user-profile-server-internal';
import { CoreFeatureFlagsRouteHandlerContext } from '@kbn/core-feature-flags-server-internal';
import type { FeatureFlagsStart } from '@kbn/core-feature-flags-server';
/**
 * Subset of `InternalCoreStart` used by {@link CoreRouteHandlerContext}
 * @internal
 */
export interface CoreRouteHandlerContextParams {
    featureFlags: FeatureFlagsStart;
    elasticsearch: InternalElasticsearchServiceStart;
    savedObjects: InternalSavedObjectsServiceStart;
    uiSettings: InternalUiSettingsServiceStart;
    deprecations: InternalDeprecationsServiceStart;
    security: InternalSecurityServiceStart;
    userProfile: InternalUserProfileServiceStart;
}
/**
 * The concrete implementation for Core's route handler context.
 *
 * @internal
 */
export declare class CoreRouteHandlerContext implements CoreRequestHandlerContext {
    #private;
    private readonly coreStart;
    private readonly request;
    constructor(coreStart: CoreRouteHandlerContextParams, request: KibanaRequest);
    get featureFlags(): CoreFeatureFlagsRouteHandlerContext;
    get elasticsearch(): CoreElasticsearchRouteHandlerContext;
    get savedObjects(): CoreSavedObjectsRouteHandlerContext;
    get uiSettings(): CoreUiSettingsRouteHandlerContext;
    get deprecations(): CoreDeprecationsRouteHandlerContext;
    get security(): CoreSecurityRouteHandlerContext;
    get userProfile(): CoreUserProfileRouteHandlerContext;
}
