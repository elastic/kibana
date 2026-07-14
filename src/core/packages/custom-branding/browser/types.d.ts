import type { Observable } from 'rxjs';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
export interface CustomBrandingStart {
    customBranding$: Observable<CustomBranding>;
    hasCustomBranding$: Observable<boolean>;
}
export interface CustomBrandingSetup {
    customBranding$: Observable<CustomBranding>;
    hasCustomBranding$: Observable<boolean>;
}
export interface CustomBrandingSetupDeps {
    injectedMetadata: InternalInjectedMetadataSetup;
}
