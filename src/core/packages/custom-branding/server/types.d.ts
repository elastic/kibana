import type { KibanaRequest } from '@kbn/core-http-server';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import type { MaybePromise } from '@kbn/utility-types';
/** @public */
export interface CustomBrandingStart {
}
export type CustomBrandingFetchFn = (request: KibanaRequest, unauthenticated: boolean) => MaybePromise<CustomBranding>;
/** @public */
export interface CustomBrandingSetup {
    register: (fetchFn: CustomBrandingFetchFn) => void;
    getBrandingFor: (request: KibanaRequest, options: {
        unauthenticated?: boolean;
    }) => Promise<CustomBranding>;
}
