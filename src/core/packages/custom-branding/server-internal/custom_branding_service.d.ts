import type { CustomBrandingFetchFn, CustomBrandingStart } from '@kbn/core-custom-branding-server';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreContext } from '@kbn/core-base-server-internal';
/**
 * @internal
 */
export interface InternalCustomBrandingSetup {
    register: (pluginName: string, fetchFn: CustomBrandingFetchFn) => void;
    getBrandingFor: (request: KibanaRequest, options?: {
        unauthenticated?: boolean;
    }) => Promise<CustomBranding>;
}
export declare class CustomBrandingService {
    private pluginName?;
    private logger;
    private fetchFn?;
    private startCalled;
    constructor(coreContext: CoreContext);
    setup(): InternalCustomBrandingSetup;
    start(): CustomBrandingStart;
    stop(): void;
    private getBrandingFor;
}
