import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { FieldFormatsContentType, HtmlContextTypeOptions, TextContextTypeOptions } from '@kbn/field-formats-plugin/common/types';
import type { EsHitRecord } from '../types';
/**
 * Formats the value of a specific field using the appropriate field formatter if available
 * or the default string field formatter otherwise.
 *
 * @param value The value to format
 * @param hit The actual search hit (required to get highlight information from)
 * @param fieldFormats Field formatters
 * @param dataView The data view if available
 * @param field The field that value was from if available
 * @param contentType Type of a converter
 * @param options Options for the converter
 * @returns An sanitized HTML string, that is safe to be applied via dangerouslySetInnerHTML
 */
export declare function formatFieldValue(value: unknown, hit: EsHitRecord, fieldFormats: FieldFormatsStart, dataView?: DataView, field?: DataViewField, contentType?: FieldFormatsContentType, options?: HtmlContextTypeOptions | TextContextTypeOptions): string;
