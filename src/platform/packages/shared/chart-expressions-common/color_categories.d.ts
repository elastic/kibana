import type { DatatableRow } from '@kbn/expressions-plugin/common';
import type { RawValue, SerializedValue } from '@kbn/data-plugin/common';
/**
 * Returns all serialized categories of the dataset for color matching.
 * All non-serializable fields will be as a plain unformatted string.
 *
 * Note: This does **NOT** support transposed columns
 */
export declare function getColorCategories(rows?: DatatableRow[], accessors?: string[], exclude?: RawValue[], legacyMode?: boolean): SerializedValue[];
/**
 * Returns all *stringified* categories of the dataset for color matching.
 *
 * Should **only** be used with legacy `palettes`
 */
export declare function getLegacyColorCategories(rows?: DatatableRow[], accessors?: string[], exclude?: RawValue[]): string[];
