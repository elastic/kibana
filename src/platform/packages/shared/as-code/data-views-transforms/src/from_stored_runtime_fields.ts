/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Functions for converting stored runtime fields to AsCodeRuntimeField format
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
import type { AsCodeRuntimeField } from '@kbn/as-code-data-views-schema';

/**
 * Convert stored runtime fields (from saved objects / DataViewSpec) to AsCodeRuntimeField[].
 *
 * Merges three separate DataViewSpec maps into a single, self-contained representation per field:
 * - Composite fields (`type === 'composite'`): subfields are inlined under `fields[]`, each
 *   looked up by the fully-qualified `parent.child` key in `fieldFormats` and `fieldAttrs`.
 * - Primitive fields: type, script, format, and attrs are all written to the top-level object.
 *
 * @param runtimeFields Map of field name → `{ type, script }` from DataViewSpec
 * @param fieldFormats Map of field name → display format `{ id, params }` from DataViewSpec
 * @param fieldAttrs Map of field name → `{ customLabel, customDescription }` from DataViewSpec
 * @returns Array of AsCodeRuntimeField objects, one per entry in `runtimeFields`
 */
export function fromStoredRuntimeFields(
  runtimeFields: DataViewSpec['runtimeFieldMap'] = {},
  fieldFormats: DataViewSpec['fieldFormats'] = {},
  fieldAttrs: DataViewSpec['fieldAttrs'] = {}
): AsCodeRuntimeField[] {
  return Object.keys(runtimeFields).map((name) => {
    const runtimeField = runtimeFields[name];

    if (runtimeField.type === RUNTIME_FIELD_COMPOSITE_TYPE) {
      const fields = runtimeField.fields || {};

      const compositeFields = Object.keys(fields).map((fieldName) => {
        const compositeName = `${name}.${fieldName}`;

        return {
          type: fields[fieldName].type,
          name: fieldName,
          ...getCommonProperties(compositeName, fieldAttrs, fieldFormats),
        };
      });

      return {
        type: RUNTIME_FIELD_COMPOSITE_TYPE,
        name,
        script: runtimeField.script?.source,
        fields: compositeFields,
      };
    }

    return {
      type: runtimeField.type,
      name,
      script: runtimeField.script?.source,
      ...getCommonProperties(name, fieldAttrs, fieldFormats),
    };
  });
}

function getCommonProperties(
  name: string,
  fieldAttrs: NonNullable<DataViewSpec['fieldAttrs']>,
  fieldFormats: NonNullable<DataViewSpec['fieldFormats']>
) {
  const fieldAttr = fieldAttrs[name];
  const format = fieldFormats[name];
  return {
    custom_label: fieldAttr?.customLabel,
    custom_description: fieldAttr?.customDescription,
    format: format?.id ? { type: format.id, params: format.params } : undefined,
  };
}
