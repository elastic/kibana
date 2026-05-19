import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ShortUrlStorage } from './types';
import type { IShortUrlClientFactory, ILocatorClient } from '../../../common/url_service';
import { ServerShortUrlClient } from './short_url_client';
/**
 * Dependencies of the Short URL Client factory.
 */
export interface ServerShortUrlClientFactoryDependencies {
    /**
     * Current version of Kibana, e.g. 7.15.0.
     */
    currentVersion: string;
    /**
     * Locators service.
     */
    locators: ILocatorClient;
}
export interface ServerShortUrlClientFactoryCreateParams {
    savedObjects?: SavedObjectsClientContract;
    storage?: ShortUrlStorage;
}
export declare class ServerShortUrlClientFactory implements IShortUrlClientFactory<ServerShortUrlClientFactoryCreateParams> {
    private readonly dependencies;
    constructor(dependencies: ServerShortUrlClientFactoryDependencies);
    get(params: ServerShortUrlClientFactoryCreateParams): ServerShortUrlClient;
}
