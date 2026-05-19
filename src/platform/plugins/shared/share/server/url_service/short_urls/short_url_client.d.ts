import type { SerializableRecord } from '@kbn/utility-types';
import type { ShortUrlRecord } from '.';
import type { IShortUrlClient, ShortUrl, ShortUrlCreateParams, ILocatorClient } from '../../../common/url_service';
import type { ShortUrlStorage } from './types';
/**
 * Dependencies of the Short URL Client.
 */
export interface ServerShortUrlClientDependencies {
    /**
     * Current version of Kibana, e.g. 7.15.0.
     */
    currentVersion: string;
    /**
     * Storage provider for short URLs.
     */
    storage: ShortUrlStorage;
    /**
     * The locators service.
     */
    locators: ILocatorClient;
}
export declare class ServerShortUrlClient implements IShortUrlClient {
    private readonly dependencies;
    constructor(dependencies: ServerShortUrlClientDependencies);
    create<P extends SerializableRecord>({ locator, params, slug, }: ShortUrlCreateParams<P>): Promise<ShortUrl<P>>;
    private extractReferences;
    private injectReferences;
    get(id: string): Promise<ShortUrl>;
    resolve(slug: string): Promise<ShortUrl>;
    /**
     * Access field updates are executed in the background as we don't need to
     * wait for them and confirm that they were successful.
     */
    protected updateAccessFields(record: ShortUrlRecord): void;
    delete(id: string): Promise<void>;
}
