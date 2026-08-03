import type { ParsedQuery, UrlStateSlices } from './types';
export interface LegacyDecodeResult {
    state: UrlStateSlices;
    consumed: ReadonlyArray<string>;
}
/**
 * Decodes legacy URL parameters into a {@link UrlStateSlices} object.
 *
 * @param params - The parsed URL parameters.
 * @param validSortFields - The valid sort fields.
 * @param onUnknownValue - A callback to call when an unknown value is encountered.
 * @returns A {@link LegacyDecodeResult} object.
 */
export declare const decodeLegacyParams: (params: ParsedQuery, validSortFields: ReadonlySet<string>, onUnknownValue?: (key: string, value: unknown) => void) => LegacyDecodeResult | null;
