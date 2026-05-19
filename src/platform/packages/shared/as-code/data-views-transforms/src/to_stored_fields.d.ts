import { type DataViewSpec } from '@kbn/data-views-plugin/common';
import type { AsCodeCompositeRuntimeField, AsCodeDataViewSpec, AsCodeFieldSettings, AsCodeRuntimeField } from '@kbn/as-code-data-views-schema';
export declare function isRuntimeField(field: AsCodeFieldSettings): field is AsCodeRuntimeField;
export declare function isCompositeRuntimeField(field: AsCodeFieldSettings): field is AsCodeCompositeRuntimeField;
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
 * Indexed field settings without attrs are skipped. Runtime fields and composite runtime subfields
 * always produce an entry (possibly empty) to preserve current stored shape.
 * Composite subfields are written under the fully-qualified `parent.child` key.
 *
 * @param fieldSettings Map of field name → indexed overrides or inline runtime definition
 * @returns A `fieldAttrs` object suitable for use in a DataViewSpec
 */
export declare function toStoredFieldAttributes(fieldSettings?: AsCodeDataViewSpec['field_settings']): DataViewSpec['fieldAttrs'];
