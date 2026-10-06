import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type { InternalCoreDiServiceStart } from '@kbn/core-di-internal';
import type { InternalInjectedMetadataStart } from '@kbn/core-injected-metadata-browser-internal';
import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { InternalSecurityServiceStart } from '@kbn/core-security-browser-internal';
import type { InternalUserProfileServiceStart } from '@kbn/core-user-profile-browser-internal';
import type { FeatureFlagsStart } from '@kbn/core-feature-flags-browser';
/** @internal */
export interface InternalCoreStart extends Omit<CoreStart, 'application' | 'injection' | 'plugins' | 'http' | 'security' | 'userProfile'> {
    application: InternalApplicationStart;
    featureFlags: FeatureFlagsStart;
    injectedMetadata: InternalInjectedMetadataStart;
    injection: InternalCoreDiServiceStart;
    http: InternalHttpStart;
    security: InternalSecurityServiceStart;
    userProfile: InternalUserProfileServiceStart;
}
