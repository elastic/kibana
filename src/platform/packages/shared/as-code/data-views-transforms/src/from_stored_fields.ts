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
 * - Composite fields: Expanded into named subfields with their own type/format/attrs
 * - Primitive fields: Mapped directly with optional script, format, and attribute metadata
 *
 * Three DataViewSpec maps are combined into a single AsCodeRuntimeField per field name,
 * making the as-code representation self-contained and human-readable.
 */

import { RUNTIME_FIELD_COMPOSITE_TYPE, type DataViewSpec } from '@kbn/data-views-plugin/common';
import type { AsCodeFieldSettings, AsCodeDataViewSpec } from '@kbn/as-code-data-views-schema';

/**
 * Convert stored field metadata maps from DataViewSpec to as-code field representations.
 *
 * Produces both:
 * - `runtime_fields`: runtime-field definitions merged with matching format/attribute metadata
 * - `field_settings`: indexed-field display overrides (formats/attrs not owned by runtime fields)
 *
 * Runtime-owned keys (including composite subfields under `parent.child`) are consumed into
 * `runtime_fields` and excluded from `field_settings` to preserve precedence and avoid duplication.
 *
 * @param runtimeFields Map of field name → `{ type, script, fields? }` from DataViewSpec
 * @param fieldFormats Map of field name → display format `{ id, params }` from DataViewSpec
 * @param fieldAttrs Map of field name → `{ customLabel, customDescription }` from DataViewSpec
 * @returns Object containing optional `runtime_fields` and optional `field_settings`
 */
export function fromStoredFields(
  runtimeFields: DataViewSpec['runtimeFieldMap'] = {},
  fieldFormats: DataViewSpec['fieldFormats'] = {},
  fieldAttrs: DataViewSpec['fieldAttrs'] = {}
): Pick<AsCodeDataViewSpec, 'runtime_fields' | 'field_settings'> {
  const fieldSettings: Record<string, AsCodeFieldSettings> = {};
  new Set([...Object.keys(fieldFormats), ...Object.keys(fieldAttrs)]).forEach((name) => {
    fieldSettings[name] = getCommonProperties(name, fieldAttrs, fieldFormats);
  });

  const runtimeFieldsAsCode = Object.keys(runtimeFields).map((name) => {
    const runtimeField = runtimeFields[name];

    if (runtimeField.type === RUNTIME_FIELD_COMPOSITE_TYPE) {
      const fields = runtimeField.fields || {};

      const compositeFields = Object.keys(fields).map((fieldName) => {
        const compositeName = `${name}.${fieldName}`;
        const commonProps = fieldSettings[compositeName];
        delete fieldSettings[compositeName];

        return {
          type: fields[fieldName].type,
          name: fieldName,
          ...commonProps,
        };
      });

      return {
        type: RUNTIME_FIELD_COMPOSITE_TYPE,
        name,
        script: runtimeField.script?.source,
        fields: compositeFields,
      };
    }

    const commonProps = fieldSettings[name];
    delete fieldSettings[name];
    return {
      type: runtimeField.type,
      name,
      script: runtimeField.script?.source,
      ...commonProps,
    };
  });

  return {
    ...(runtimeFieldsAsCode.length > 0 && { runtime_fields: runtimeFieldsAsCode }),
    ...(Object.keys(fieldSettings).length > 0 && { field_settings: fieldSettings }),
  };
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
