import type { CoreSetup } from '@kbn/core-lifecycle-browser';
import type { InternalApplicationSetup } from '@kbn/core-application-browser-internal';
import type { InternalChromeSetup } from '@kbn/core-chrome-browser-internal';
import type { InternalCoreDiServiceSetup } from '@kbn/core-di-internal';
import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { InternalHttpSetup } from '@kbn/core-http-browser-internal';
import type { InternalSecurityServiceSetup } from '@kbn/core-security-browser-internal';
import type { InternalUserProfileServiceSetup } from '@kbn/core-user-profile-browser-internal';
import type { FeatureFlagsSetup } from '@kbn/core-feature-flags-browser';
/** @internal */
export interface InternalCoreSetup extends Omit<CoreSetup, 'application' | 'chrome' | 'injection' | 'plugins' | 'getStartServices' | 'http' | 'security' | 'userProfile'> {
    application: InternalApplicationSetup;
    chrome: InternalChromeSetup;
    featureFlags: FeatureFlagsSetup;
    injectedMetadata: InternalInjectedMetadataSetup;
    injection: InternalCoreDiServiceSetup;
    http: InternalHttpSetup;
    security: InternalSecurityServiceSetup;
    userProfile: InternalUserProfileServiceSetup;
}
