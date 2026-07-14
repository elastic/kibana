import type { IShortUrlClientFactory } from '../../../common/url_service';
import type { BrowserShortUrlClientDependencies } from './short_url_client';
import { BrowserShortUrlClient } from './short_url_client';
export type BrowserShortUrlClientFactoryDependencies = BrowserShortUrlClientDependencies;
export type BrowserShortUrlClientFactoryCreateParams = null;
export declare class BrowserShortUrlClientFactory implements IShortUrlClientFactory<BrowserShortUrlClientFactoryCreateParams> {
    private readonly dependencies;
    constructor(dependencies: BrowserShortUrlClientFactoryDependencies);
    get(params: BrowserShortUrlClientFactoryCreateParams): BrowserShortUrlClient;
}
