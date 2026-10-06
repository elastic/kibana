import type { SerializableRecord } from '@kbn/utility-types';
import type { LegacyShortUrlLocatorParams } from '../../../common/url_service/locators/legacy_short_url_locator';
import type { ShortUrlRedirectLocatorParams } from '../../../common/url_service/locators/short_url_redirect_locator';
import type { IShortUrlClient, ShortUrl, ShortUrlCreateParams, ILocatorClient, LocatorPublic } from '../../../common/url_service';
export interface BrowserShortUrlClientHttp {
    basePath: {
        get: () => string;
    };
    fetch: <T>(url: string, params: BrowserShortUrlClientHttpFetchParams) => Promise<T>;
}
interface BrowserShortUrlClientHttpFetchParams {
    method: 'GET' | 'POST' | 'DELETE';
    body?: string;
}
/**
 * Dependencies of the Short URL Client.
 */
export interface BrowserShortUrlClientDependencies {
    /**
     * The locators service.
     */
    locators: ILocatorClient;
    /**
     * HTTP client.
     */
    http: BrowserShortUrlClientHttp;
}
export declare class BrowserShortUrlClient implements IShortUrlClient {
    private readonly dependencies;
    constructor(dependencies: BrowserShortUrlClientDependencies);
    create<P extends SerializableRecord>({ locator, params, slug, }: ShortUrlCreateParams<P>): Promise<ShortUrl<P>>;
    createWithLocator<P extends SerializableRecord>(params: ShortUrlCreateParams<P>, isAbsoluteTime?: boolean): Promise<ShortUrlCreateResponse<P>>;
    createFromLongUrl(longUrl: string, isAbsoluteTime?: boolean): Promise<ShortUrlCreateFromLongUrlResponse>;
    get(id: string): Promise<ShortUrl>;
    resolve(slug: string): Promise<ShortUrl>;
    delete(id: string): Promise<void>;
}
export interface ShortUrlCreateResponse<LocatorParams extends SerializableRecord = SerializableRecord> extends ShortUrl<LocatorParams> {
    locator: LocatorPublic<ShortUrlRedirectLocatorParams>;
    params: ShortUrlRedirectLocatorParams;
}
export interface ShortUrlCreateFromLongUrlResponse extends ShortUrlCreateResponse<LegacyShortUrlLocatorParams> {
    url: string;
}
export {};
