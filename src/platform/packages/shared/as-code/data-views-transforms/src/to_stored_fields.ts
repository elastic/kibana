/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

import type { RuntimePrimitiveTypes } from '@kbn/data-views-plugin/common';
import { type DataViewSpec, RUNTIME_FIELD_COMPOSITE_TYPE } from '@kbn/data-views-plugin/common';
import type {
  AsCodeCompositeRuntimeField,
  AsCodeDataViewSpec,
  AsCodeFieldSettings,
  AsCodeRuntimeField,
} from '@kbn/as-code-data-views-schema';

export function isRuntimeField(field: AsCodeFieldSettings): field is AsCodeRuntimeField {
  return 'type' in field;
}

export function isCompositeRuntimeField(
  field: AsCodeFieldSettings
): field is AsCodeCompositeRuntimeField {
  return isRuntimeField(field) && field.type === RUNTIME_FIELD_COMPOSITE_TYPE;
}

/**
 * Convert as-code `field_settings` to the `runtimeFieldMap` entry of a DataViewSpec.
 * Composite fields are expanded into a `fields` record keyed by subfield name.
 * Script source strings are wrapped in the `{ source }` shape expected by the stored format.
 *
 * @param fieldSettings Map of field name → indexed overrides or inline runtime definition
 * @returns A `runtimeFieldMap` object suitable for use in a DataViewSpec
 */
export function toStoredRuntimeFields(
  fieldSettings: AsCodeDataViewSpec['field_settings'] = {}
): DataViewSpec['runtimeFieldMap'] {
  const runtimeFieldMap: DataViewSpec['runtimeFieldMap'] = {};
  for (const [name, field] of Object.entries(fieldSettings)) {
    if (!isRuntimeField(field)) continue;
    runtimeFieldMap[name] = {
      type: field.type,
      ...(field.script && { script: { source: field.script } }),
    };

    if (!isCompositeRuntimeField(field)) continue;
    runtimeFieldMap[name].fields = Object.keys(field.fields).reduce<
      Record<string, { type: RuntimePrimitiveTypes }>
    >(
      (acc, subName) => ({
        ...acc,
        [subName]: { type: field.fields[subName].type },
      }),
      {}
    );
  }

  return runtimeFieldMap;
}

/**
 * Convert as-code `field_settings` to the `fieldFormats` entry of a DataViewSpec.
 * Only fields that declare a `format` are included. Composite subfields are written
 * under the fully-qualified `parent.child` key.
 *
 * @param fieldSettings Map of field name → indexed overrides or inline runtime definition
 * @returns A `fieldFormats` object suitable for use in a DataViewSpec
 */
export function toStoredFieldFormats(
  fieldSettings: AsCodeDataViewSpec['field_settings'] = {}
): DataViewSpec['fieldFormats'] {
  const fieldFormats: DataViewSpec['fieldFormats'] = {};
  for (const [name, field] of Object.entries(fieldSettings)) {
    if ('format' in field && field.format) {
      fieldFormats[name] = { id: field.format.type, params: field.format.params };
    }
    if (!isCompositeRuntimeField(field)) continue;
    for (const [subName, subField] of Object.entries(field.fields)) {
      if ('format' in subField && subField.format) {
        fieldFormats[`${name}.${subName}`] = {
          id: subField.format.type,
          params: subField.format.params,
        };
      }
    }
  }
  return fieldFormats;
}

/**
 * Convert as-code `field_settings` to the `fieldAttrs` entry of a DataViewSpec.
 * Indexed field settings without attrs are skipped. Runtime fields and composite runtime subfields
 * always produce an entry (possibly empty) to preserve current stored shape.
 * Composite subfields are written under the fully-qualified `parent.child` key.
 *
 * @param fieldSettings Map of field name → indexed overrides or inline runtime definition
 * @returns A `fieldAttrs` object suitable for use in a DataViewSpec
 */
export function toStoredFieldAttributes(
  fieldSettings: AsCodeDataViewSpec['field_settings'] = {}
): DataViewSpec['fieldAttrs'] {
  const fieldAttrs: DataViewSpec['fieldAttrs'] = {};
  for (const [name, field] of Object.entries(fieldSettings)) {
    if (isRuntimeField(field)) {
      if (!isCompositeRuntimeField(field)) {
        fieldAttrs[name] = {
          ...(field.custom_label && { customLabel: field.custom_label }),
          ...(field.custom_description && { customDescription: field.custom_description }),
        };
      } else {
        for (const [subName, subField] of Object.entries(field.fields)) {
          fieldAttrs[`${name}.${subName}`] = {
            ...(subField.custom_label && { customLabel: subField.custom_label }),
            ...(subField.custom_description && { customDescription: subField.custom_description }),
          };
        }
      }
    } else if ('custom_label' in field || 'custom_description' in field) {
      fieldAttrs[name] = {
        ...(field.custom_label && { customLabel: field.custom_label }),
        ...(field.custom_description && { customDescription: field.custom_description }),
      };
    }
  }
  return fieldAttrs;
}
