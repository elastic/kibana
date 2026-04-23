/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Functions for converting AsCodeRuntimeField[] back to the three DataViewSpec maps
 *
 * CONVERSION APPROACH:
 * - A single AsCodeRuntimeField is split into up to three DataViewSpec contributions:
 *   runtimeFieldMap (type + script), fieldFormats (display format), fieldAttrs (label/description)
 * - Composite fields: subfields are written under the `parent.child` key in formats and attrs
 * - Primitive fields: written directly under the field name
 *
 * Use the three exported helpers together to fully reconstruct the DataViewSpec runtime-field state.
 */

import {
  type RuntimeFieldSpec,
  type DataViewSpec,
  type RuntimePrimitiveTypes,
  RUNTIME_FIELD_COMPOSITE_TYPE,
} from '@kbn/data-views-plugin/common';
import type { AsCodeRuntimeField } from '@kbn/as-code-data-views-schema';

/**
 * Convert AsCodeRuntimeField[] to the `runtimeFieldMap` entry of a DataViewSpec.
 *
 * Composite fields are expanded into a `fields` record keyed by subfield name.
 * Script source strings are wrapped in the `{ source }` shape expected by the stored format.
 *
 * @param runtimeFields Array of as-code runtime field definitions
 * @returns A `runtimeFieldMap` object suitable for use in a DataViewSpec
 */
export function toStoredRuntimeFields(
  runtimeFields: AsCodeRuntimeField[] = []
): DataViewSpec['runtimeFieldMap'] {
  const runtimeFieldMap: DataViewSpec['runtimeFieldMap'] = {};

  for (const runtimeField of runtimeFields) {
    const parsedField: RuntimeFieldSpec = {
      type: runtimeField.type,
      ...(runtimeField.script && { script: { source: runtimeField.script } }),
    };

    if (runtimeField.type === RUNTIME_FIELD_COMPOSITE_TYPE) {
      parsedField.fields = runtimeField.fields.reduce<
        Record<string, { type: RuntimePrimitiveTypes }>
      >(
        (acc, field) => ({
          ...acc,
          [field.name]: { type: field.type },
        }),
        {}
      );
    }

    runtimeFieldMap[runtimeField.name] = parsedField;
  }

  return runtimeFieldMap;
}

/**
 * Convert AsCodeRuntimeField[] to the `fieldFormats` entry of a DataViewSpec.
 *
 * Only fields that declare a `format` are included. Composite subfields are written
 * under the fully-qualified `parent.child` key.
 *
 * @param runtimeFields Array of as-code runtime field definitions
 * @returns A `fieldFormats` object suitable for use in a DataViewSpec
 */
export function toStoredFieldFormats(
  runtimeFields: AsCodeRuntimeField[] = []
): DataViewSpec['fieldFormats'] {
  const fieldFormats: DataViewSpec['fieldFormats'] = {};

  for (const runtimeField of runtimeFields) {
    if (runtimeField.type === RUNTIME_FIELD_COMPOSITE_TYPE) {
      for (const field of runtimeField.fields) {
        if (!field.format) continue;
        fieldFormats[`${runtimeField.name}.${field.name}`] = {
          id: field.format.type,
          params: field.format.params,
        };
      }
      continue;
    }
    if (!runtimeField.format) continue;
    fieldFormats[runtimeField.name] = {
      id: runtimeField.format.type,
      params: runtimeField.format.params,
    };
  }

  return fieldFormats;
}

/**
 * Convert AsCodeRuntimeField[] to the `fieldAttrs` entry of a DataViewSpec.
 *
 * Only fields that declare `custom_label` or `custom_description` produce an entry.
 * Composite subfields are written under the fully-qualified `parent.child` key.
 *
 * @param runtimeFields Array of as-code runtime field definitions
 * @returns A `fieldAttrs` object suitable for use in a DataViewSpec
 */
export function toStoredFieldAttributes(
  runtimeFields: AsCodeRuntimeField[] = []
): DataViewSpec['fieldAttrs'] {
  const fieldAttrs: DataViewSpec['fieldAttrs'] = {};

  for (const runtimeField of runtimeFields) {
    if (runtimeField.type === RUNTIME_FIELD_COMPOSITE_TYPE) {
      for (const field of runtimeField.fields) {
        const compositeName = `${runtimeField.name}.${field.name}`;
        fieldAttrs[compositeName] = {
          ...(field.custom_label && { customLabel: field.custom_label }),
          ...(field.custom_description && { customDescription: field.custom_description }),
        };
      }
      continue;
    }

    fieldAttrs[runtimeField.name] = {
      ...(runtimeField.custom_label && { customLabel: runtimeField.custom_label }),
      ...(runtimeField.custom_description && {
        customDescription: runtimeField.custom_description,
      }),
    };
  }

  return fieldAttrs;
}
