import type { SerializableRecord } from '@kbn/utility-types';
import type { KibanaLocation, LocatorDefinition } from '..';
export declare const SHORT_URL_REDIRECT_LOCATOR = "SHORT_URL_REDIRECT_LOCATOR";
export interface ShortUrlRedirectLocatorParams extends SerializableRecord {
    slug: string;
}
/**
 * Locator that points to a frontend short URL redirect app by slug.
 */
export declare class ShortUrlRedirectLocatorDefinition implements LocatorDefinition<ShortUrlRedirectLocatorParams> {
    readonly id = "SHORT_URL_REDIRECT_LOCATOR";
    getLocation(params: ShortUrlRedirectLocatorParams): Promise<KibanaLocation>;
}
