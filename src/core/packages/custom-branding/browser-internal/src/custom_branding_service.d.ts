import type { CustomBrandingStart, CustomBrandingSetup, CustomBrandingSetupDeps } from '@kbn/core-custom-branding-browser';
export declare class CustomBrandingService {
    private customBranding$;
    private stop$;
    /**
     * @public
     */
    setup({ injectedMetadata }: CustomBrandingSetupDeps): CustomBrandingSetup;
    /**
     * @public
     */
    start(): CustomBrandingStart;
    stop(): void;
}
