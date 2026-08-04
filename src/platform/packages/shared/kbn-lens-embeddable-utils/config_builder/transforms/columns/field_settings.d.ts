import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { AsCodeDataViewSpec } from '@kbn/as-code-data-views-schema';
/**
 * Build the embedded-API `field_settings` map from a form-based ad-hoc `DataViewSpec`.
 *
 * The three per-field DataViewSpec maps (`runtimeFieldMap`, `fieldFormats`,
 * `fieldAttrs`) are merged into a single `field_settings` record keyed by field
 * name.
 */
export declare function toApiFieldSettings(spec: DataViewSpec): AsCodeDataViewSpec['field_settings'];
/**
 * Rebuild the three per-field `DataViewSpec` maps from the embedded-API
 * `field_settings` record.
 */
export declare function fromApiFieldSettings(fieldSettings?: AsCodeDataViewSpec['field_settings']): Pick<DataViewSpec, 'runtimeFieldMap' | 'fieldFormats' | 'fieldAttrs'>;
