import type { LocatorClientDependencies } from './locators';
import { LocatorClient } from './locators';
import type { IShortUrlClientFactoryProvider, IShortUrlClientFactory, IShortUrlClient } from './short_urls';
export interface UrlServiceDependencies<D = unknown, ShortUrlClient extends IShortUrlClient = IShortUrlClient> extends LocatorClientDependencies {
    shortUrls: IShortUrlClientFactoryProvider<D, ShortUrlClient>;
}
/**
 * Common URL Service client interface for server-side and client-side.
 */
export declare class UrlService<D = unknown, ShortUrlClient extends IShortUrlClient = IShortUrlClient> {
    protected readonly deps: UrlServiceDependencies<D, ShortUrlClient>;
    /**
     * Client to work with locators.
     */
    readonly locators: LocatorClient;
    readonly shortUrls: IShortUrlClientFactory<D, ShortUrlClient>;
    constructor(deps: UrlServiceDependencies<D, ShortUrlClient>);
}
