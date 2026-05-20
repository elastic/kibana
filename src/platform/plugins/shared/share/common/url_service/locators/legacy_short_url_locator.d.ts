import type { SerializableRecord } from '@kbn/utility-types';
import type { KibanaLocation, LocatorDefinition } from '..';
export declare const LEGACY_SHORT_URL_LOCATOR_ID = "LEGACY_SHORT_URL_LOCATOR";
export interface LegacyShortUrlLocatorParams extends SerializableRecord {
    url: string;
}
export declare class LegacyShortUrlLocatorDefinition implements LocatorDefinition<LegacyShortUrlLocatorParams> {
    readonly id = "LEGACY_SHORT_URL_LOCATOR";
    getLocation(params: LegacyShortUrlLocatorParams): Promise<KibanaLocation>;
}
