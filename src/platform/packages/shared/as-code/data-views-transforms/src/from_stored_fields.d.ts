/**
 * Functions for converting stored field metadata to as-code field format
 *
 * CONVERSION APPROACH:
 * - Type-first: Uses the `type` property to distinguish composite vs primitive fields
 * - Composite fields: Subfields are keyed under `fields` with their short names
 * - Primitive fields: Mapped directly with optional script, format, and attribute metadata
 *
 * Three DataViewSpec maps are combined into a single `field_settings` map keyed by field name.
 */
import { type DataViewSpec } from '@kbn/data-views-plugin/common';
import type { AsCodeDataViewSpec } from '@kbn/as-code-data-views-schema';
/**
 * Convert stored field metadata maps from DataViewSpec to as-code field representations.
 *
 * Produces `field_settings` where runtime fields appear inline (with `type` and optional `script`)
 * alongside indexed-field display overrides.
 *
 * @param runtimeFields Map of field name → `{ type, script, fields? }` from DataViewSpec
 * @param fieldFormats Map of field name → display format `{ id, params }` from DataViewSpec
 * @param fieldAttrs Map of field name → `{ customLabel, customDescription }` from DataViewSpec
 * @returns `field_settings` map, or `undefined` when there is nothing to persist
 */
export declare function fromStoredFields(runtimeFields?: DataViewSpec['runtimeFieldMap'], fieldFormats?: DataViewSpec['fieldFormats'], fieldAttrs?: DataViewSpec['fieldAttrs']): AsCodeDataViewSpec['field_settings'];
