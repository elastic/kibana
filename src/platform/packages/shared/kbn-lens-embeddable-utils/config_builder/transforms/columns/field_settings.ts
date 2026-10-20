/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { AsCodeDataViewSpec } from '@kbn/as-code-data-views-schema';
import {
  fromStoredFields,
  toStoredFieldAttributes,
  toStoredFieldFormats,
  toStoredRuntimeFields,
} from '@kbn/as-code-data-views-transforms';

/**
 * Build the embedded-API `field_settings` map from a form-based ad-hoc `DataViewSpec`.
 *
 * The three per-field DataViewSpec maps (`runtimeFieldMap`, `fieldFormats`,
 * `fieldAttrs`) are merged into a single `field_settings` record keyed by field
 * name.
 */
export function toApiFieldSettings(spec: DataViewSpec): AsCodeDataViewSpec['field_settings'] {
  return fromStoredFields(spec.runtimeFieldMap, spec.fieldFormats, spec.fieldAttrs);
}

/**
 * Rebuild the three per-field `DataViewSpec` maps from the embedded-API
 * `field_settings` record.
 */
export function fromApiFieldSettings(
  fieldSettings?: AsCodeDataViewSpec['field_settings']
): Pick<DataViewSpec, 'runtimeFieldMap' | 'fieldFormats' | 'fieldAttrs'> {
  const runtimeFieldMap = toStoredRuntimeFields(fieldSettings) ?? {};
  const fieldFormats = toStoredFieldFormats(fieldSettings) ?? {};
  const fieldAttrs = toStoredFieldAttributes(fieldSettings) ?? {};

  return {
    ...(Object.keys(runtimeFieldMap).length > 0 ? { runtimeFieldMap } : {}),
    ...(Object.keys(fieldFormats).length > 0 ? { fieldFormats } : {}),
    ...(Object.keys(fieldAttrs).length > 0 ? { fieldAttrs } : {}),
  };
}
