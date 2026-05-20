import type { FieldFormatInstanceType, IFieldFormat, SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
type GetFieldFormat = (mapping: SerializedFieldFormat) => IFieldFormat;
/**
 * Certain aggs have custom field formats that have dependency on aggs code.
 * This function creates such field formats types and then those are added to field formatters registry
 *
 * These formats can't be used from field format editor UI
 *
 * This function is internal to the data plugin, and only exists for use inside
 * the field formats service.
 *
 * @internal
 */
export declare function getAggsFormats(getFieldFormat: GetFieldFormat): FieldFormatInstanceType[];
export {};
