/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  type RuntimeFieldSpec,
  type DataViewSpec,
  type RuntimePrimitiveTypes,
  RUNTIME_FIELD_COMPOSITE_TYPE,
} from '@kbn/data-views-plugin/common';
import type { AsCodeRuntimeField } from '@kbn/as-code-data-views-schema';

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
      parsedField.fields = runtimeField.fields.reduce(
        (acc, field) => ({
          ...acc,
          [field.name]: { type: field.type },
        }),
        {} as Record<string, { type: RuntimePrimitiveTypes }>
      );
    }

    runtimeFieldMap[runtimeField.name] = parsedField;
  }

  return runtimeFieldMap;
}

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
