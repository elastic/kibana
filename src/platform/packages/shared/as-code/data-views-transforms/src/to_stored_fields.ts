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

import {
  type RuntimeFieldSpec,
  type DataViewSpec,
  type RuntimePrimitiveTypes,
  RUNTIME_FIELD_COMPOSITE_TYPE,
} from '@kbn/data-views-plugin/common';
import type { AsCodeDataViewSpec, AsCodeFieldSettings } from '@kbn/as-code-data-views-schema';

/**
 * Convert as-code runtime fields to the `runtimeFieldMap` entry of a DataViewSpec.
 *
 * Composite fields are expanded into a `fields` record keyed by subfield name.
 * Script source strings are wrapped in the `{ source }` shape expected by the stored format.
 *
 * @param fields Input containing `runtime_fields`
 * @returns A `runtimeFieldMap` object suitable for use in a DataViewSpec
 */
export function toStoredRuntimeFields({
  runtime_fields: runtimeFields = [],
}: Pick<AsCodeDataViewSpec, 'runtime_fields'> = {}): DataViewSpec['runtimeFieldMap'] {
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
 * Convert as-code runtime fields and field settings to the `fieldFormats` entry of a DataViewSpec.
 *
 * Only fields that declare a `format` are included. Composite subfields are written
 * under the fully-qualified `parent.child` key.
 *
 * @param fields Input containing `runtime_fields` and `field_settings`
 * @returns A `fieldFormats` object suitable for use in a DataViewSpec
 */
export function toStoredFieldFormats({
  runtime_fields: runtimeFields = [],
  field_settings: fieldSettings = {},
}: Pick<
  AsCodeDataViewSpec,
  'runtime_fields' | 'field_settings'
> = {}): DataViewSpec['fieldFormats'] {
  const fieldFormats: DataViewSpec['fieldFormats'] = {};
  const addToFieldFormats = (name: string, { format }: AsCodeFieldSettings) => {
    if (!format) return;
    fieldFormats[name] = {
      id: format.type,
      params: format.params,
    };
  };

  Object.entries(fieldSettings).forEach(([name, attrs]) => addToFieldFormats(name, attrs));

  for (const runtimeField of runtimeFields) {
    if (runtimeField.type === RUNTIME_FIELD_COMPOSITE_TYPE) {
      for (const field of runtimeField.fields) {
        addToFieldFormats(`${runtimeField.name}.${field.name}`, field);
      }
    } else {
      addToFieldFormats(runtimeField.name, runtimeField);
    }
  }

  return fieldFormats;
}

/**
 * Convert as-code runtime fields and field settings to the `fieldAttrs` entry of a DataViewSpec.
 *
 * Indexed field settings without attrs are skipped. Runtime fields and composite runtime subfields
 * always produce an entry (possibly empty) to preserve current stored shape.
 * Composite subfields are written under the fully-qualified `parent.child` key.
 *
 * @param fields Input containing `runtime_fields` and `field_settings`
 * @returns A `fieldAttrs` object suitable for use in a DataViewSpec
 */
export function toStoredFieldAttributes({
  runtime_fields: runtimeFields = [],
  field_settings: fieldSettings = {},
}: Pick<AsCodeDataViewSpec, 'runtime_fields' | 'field_settings'> = {}): DataViewSpec['fieldAttrs'] {
  const fieldAttrs: DataViewSpec['fieldAttrs'] = {};
  const addToFieldAttrs = (name: string, attrs: AsCodeFieldSettings, alwaysWrite = false) => {
    const { custom_label: customLabel, custom_description: customDescription } = attrs;
    if (!customLabel && !customDescription && !alwaysWrite) return;
    fieldAttrs[name] = {
      ...(customLabel && { customLabel }),
      ...(customDescription && { customDescription }),
    };
  };

  Object.entries(fieldSettings).forEach(([name, attrs]) => addToFieldAttrs(name, attrs));

  for (const runtimeField of runtimeFields) {
    if (runtimeField.type === RUNTIME_FIELD_COMPOSITE_TYPE) {
      for (const field of runtimeField.fields) {
        addToFieldAttrs(`${runtimeField.name}.${field.name}`, field, true);
      }
    } else {
      addToFieldAttrs(runtimeField.name, runtimeField, true);
    }
  }

  return fieldAttrs;
}
