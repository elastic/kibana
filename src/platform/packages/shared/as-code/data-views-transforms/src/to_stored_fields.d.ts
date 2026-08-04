/**
 * Functions for converting as-code fields back to the three DataViewSpec maps
 *
 * CONVERSION APPROACH:
 * - Runtime fields are split into up to three DataViewSpec contributions:
 *   runtimeFieldMap (type + script), fieldFormats (display format), fieldAttrs (label/description)
 * - Composite fields: subfields are written under the `parent.child` key in formats and attrs
 * - Primitive fields: written directly under the field name
 *
 * Use the three exported helpers together to reconstruct DataViewSpec field state.
 */
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { type AsCodeCompositeRuntimeField, type AsCodeDataViewSpec, type AsCodeFieldSettings, type AsCodeRuntimeField, type AsCodeSavedCompositeRuntimeField, type AsCodeSavedDataView, type AsCodeSavedFieldSettings, type AsCodeSavedRuntimeField } from '@kbn/as-code-data-views-schema';
export declare function isRuntimeField(field: AsCodeFieldSettings | AsCodeSavedFieldSettings): field is AsCodeRuntimeField | AsCodeSavedRuntimeField;
export declare function isCompositeRuntimeField(field: AsCodeFieldSettings | AsCodeSavedFieldSettings): field is AsCodeCompositeRuntimeField | AsCodeSavedCompositeRuntimeField;
/**
 * Convert as-code `field_settings` to the `runtimeFieldMap` entry of a DataViewSpec.
 * Composite fields are expanded into a `fields` record keyed by subfield name.
 * Script source strings are wrapped in the `{ source }` shape expected by the stored format.
 *
 * @param fieldSettings Map of field name → indexed overrides or inline runtime definition
 * @returns A `runtimeFieldMap` object suitable for use in a DataViewSpec
 */
export declare function toStoredRuntimeFields(fieldSettings?: AsCodeDataViewSpec['field_settings']): DataViewSpec['runtimeFieldMap'];
/**
 * Convert as-code `field_settings` to the `fieldFormats` entry of a DataViewSpec.
 * Only fields that declare a `format` are included. Composite subfields are written
 * under the fully-qualified `parent.child` key.
 *
 * @param fieldSettings Map of field name → indexed overrides or inline runtime definition
 * @returns A `fieldFormats` object suitable for use in a DataViewSpec
 */
export declare function toStoredFieldFormats(fieldSettings?: AsCodeDataViewSpec['field_settings']): DataViewSpec['fieldFormats'];
/**
 * Convert as-code `field_settings` to the `fieldAttrs` entry of a DataViewSpec.
 * Only fields with at least one attribute (`customLabel`, `customDescription`, or `count`) produce
 * an entry.
 * Composite subfields are written under the fully-qualified `parent.child` key.
 *
 * @param fieldSettings Map of field name → indexed overrides or inline runtime definition
 * @returns A `fieldAttrs` object suitable for use in a DataViewSpec
 */
export declare function toStoredFieldAttributes(fieldSettings?: AsCodeDataViewSpec['field_settings'] | AsCodeSavedDataView['field_settings']): DataViewSpec['fieldAttrs'];
