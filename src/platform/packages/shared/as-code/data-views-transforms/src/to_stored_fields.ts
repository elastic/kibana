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

import type { DataViewSpec, RuntimePrimitiveTypes } from '@kbn/data-views-plugin/common';
import {
  RUNTIME_FIELD_COMPOSITE_TYPE,
  type AsCodeCompositeRuntimeField,
  type AsCodeDataViewSpec,
  type AsCodeFieldSettings,
  type AsCodeRuntimeField,
  type AsCodeSavedCompositeRuntimeField,
  type AsCodeSavedDataView,
  type AsCodeSavedFieldSettings,
  type AsCodeSavedRuntimeField,
} from '@kbn/as-code-data-views-schema';

export function isRuntimeField(
  field: AsCodeFieldSettings | AsCodeSavedFieldSettings
): field is AsCodeRuntimeField | AsCodeSavedRuntimeField {
  return 'type' in field;
}

export function isCompositeRuntimeField(
  field: AsCodeFieldSettings | AsCodeSavedFieldSettings
): field is AsCodeCompositeRuntimeField | AsCodeSavedCompositeRuntimeField {
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
      fieldFormats[name] = {
        id: field.format.type,
        ...(field.format.params ? { params: field.format.params } : {}),
      };
    }
    if (!isCompositeRuntimeField(field)) continue;
    for (const [subName, subField] of Object.entries(field.fields)) {
      if ('format' in subField && subField.format) {
        fieldFormats[`${name}.${subName}`] = {
          id: subField.format.type,
          ...(subField.format.params ? { params: subField.format.params } : {}),
        };
      }
    }
  }
  return fieldFormats;
}

/**
 * Convert as-code `field_settings` to the `fieldAttrs` entry of a DataViewSpec.
 * Only fields with at least one attribute (`customLabel`, `customDescription`, or `count`) produce
 * an entry.
 * Composite subfields are written under the fully-qualified `parent.child` key.
 *
 * @param fieldSettings Map of field name → indexed overrides or inline runtime definition
 * @returns A `fieldAttrs` object suitable for use in a DataViewSpec
 */
export function toStoredFieldAttributes(
  fieldSettings: AsCodeDataViewSpec['field_settings'] | AsCodeSavedDataView['field_settings'] = {}
): DataViewSpec['fieldAttrs'] {
  const fieldAttrs: DataViewSpec['fieldAttrs'] = {};

  const assignAttrs = (key: string, field: AsCodeFieldSettings | AsCodeSavedFieldSettings) => {
    const attrs = buildFieldAttrs(field);
    if (Object.keys(attrs).length > 0) {
      fieldAttrs[key] = attrs;
    }
  };

  for (const [name, field] of Object.entries(fieldSettings)) {
    if (isCompositeRuntimeField(field)) {
      for (const [subName, subField] of Object.entries(field.fields)) {
        assignAttrs(`${name}.${subName}`, subField);
      }
    } else {
      assignAttrs(name, field);
    }
  }

  return fieldAttrs;
}

function buildFieldAttrs(field: AsCodeFieldSettings | AsCodeSavedFieldSettings) {
  return {
    ...('custom_label' in field && field.custom_label && { customLabel: field.custom_label }),
    ...('custom_description' in field &&
      field.custom_description && { customDescription: field.custom_description }),
    ...getPopularity(field),
  };
}

function getPopularity(field: AsCodeFieldSettings | AsCodeSavedFieldSettings) {
  if ('popularity' in field && field.popularity !== undefined) return { count: field.popularity };
  return {};
}
