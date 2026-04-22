/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

import { RUNTIME_FIELD_COMPOSITE_TYPE, type DataViewSpec } from '@kbn/data-views-plugin/common';
import type {
  AsCodeRuntimeBaseField,
  AsCodeFieldSettings,
  AsCodeDataViewSpec,
} from '@kbn/as-code-data-views-schema';

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
export function fromStoredFields(
  runtimeFields: DataViewSpec['runtimeFieldMap'] = {},
  fieldFormats: DataViewSpec['fieldFormats'] = {},
  fieldAttrs: DataViewSpec['fieldAttrs'] = {}
): AsCodeDataViewSpec['field_settings'] {
  const fieldSettings: AsCodeDataViewSpec['field_settings'] = {};
  new Set([...Object.keys(fieldFormats), ...Object.keys(fieldAttrs)]).forEach((name) => {
    fieldSettings[name] = getCommonProperties(name, fieldAttrs, fieldFormats);
  });

  for (const [name, runtimeField] of Object.entries(runtimeFields)) {
    if (runtimeField.type === RUNTIME_FIELD_COMPOSITE_TYPE) {
      const fields = runtimeField.fields ?? {};

      const compositeFields: Record<string, AsCodeRuntimeBaseField> = {};
      for (const [subName, subField] of Object.entries(fields)) {
        const compositeName = `${name}.${subName}`;
        compositeFields[subName] = {
          ...fieldSettings[compositeName],
          type: subField.type,
        };
        delete fieldSettings[compositeName];
      }

      fieldSettings[name] = {
        type: RUNTIME_FIELD_COMPOSITE_TYPE,
        ...(runtimeField.script?.source !== undefined && { script: runtimeField.script.source }),
        fields: compositeFields,
      };
    } else {
      fieldSettings[name] = {
        ...fieldSettings[name],
        type: runtimeField.type,
        ...(runtimeField.script?.source !== undefined && { script: runtimeField.script.source }),
      };
    }
  }

  return Object.keys(fieldSettings).length > 0 ? fieldSettings : undefined;
}

function getCommonProperties(
  name: string,
  fieldAttrs: NonNullable<DataViewSpec['fieldAttrs']>,
  fieldFormats: NonNullable<DataViewSpec['fieldFormats']>
): AsCodeFieldSettings {
  const fieldAttr = fieldAttrs[name];
  const format = fieldFormats[name];

  return {
    ...(fieldAttr && 'customLabel' in fieldAttr && { custom_label: fieldAttr.customLabel }),
    ...(fieldAttr &&
      'customDescription' in fieldAttr && { custom_description: fieldAttr.customDescription }),
    ...(format?.id && { format: { type: format.id, params: format.params } }),
  };
}
