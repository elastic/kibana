import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ShareMenuManagerStart } from './services';
import type { ShareMenuRegistrySetup } from './services';
import { ShareRegistry } from './services';
import type { RedirectOptions } from '../common/url_service/locators/redirect';
import type { AnonymousAccessServiceContract } from '../common';
import type { BrowserUrlService } from './types';
/** @public */
export interface SharePublicSetup extends ShareMenuRegistrySetup {
    /**
     * Utilities to work with URL locators and short URLs.
     */
    url: BrowserUrlService;
    /**
     * Accepts serialized values for extracting a locator, migrating state from a provided version against
     * the locator, then using the locator to navigate.
     */
    navigate(options: RedirectOptions): void;
    /**
     * Sets the provider for the anonymous access service; this is consumed by the Security plugin to avoid a circular dependency.
     */
    setAnonymousAccessServiceProvider: (provider: () => AnonymousAccessServiceContract) => void;
}
/** @public */
export type SharePublicStart = ShareMenuManagerStart & {
    /**
     * Utilities to work with URL locators and short URLs.
     */
    url: BrowserUrlService;
    /**
     * Accepts serialized values for extracting a locator, migrating state from a provided version against
     * the locator, then using the locator to navigate.
     */
    navigate(options: RedirectOptions): void;
    /**
     * method to get all available integrations
     */
    availableIntegrations: ShareRegistry['availableIntegrations'];
};
export interface SharePublicSetupDependencies {
}
export interface SharePublicStartDependencies {
}
export declare class SharePlugin implements Plugin<SharePublicSetup, SharePublicStart, SharePublicSetupDependencies, SharePublicStartDependencies> {
    private readonly initializerContext;
    private readonly shareRegistry;
    private readonly shareContextMenu;
    private redirectManager?;
    private url?;
    private anonymousAccessServiceProvider?;
    private licenseSubscription?;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup): SharePublicSetup;
    start(core: CoreStart, { licensing }: {
        licensing?: LicensingPluginStart;
    }): SharePublicStart;
    stop(): void;
}
