/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { RUNTIME_FIELD_COMPOSITE_TYPE, type DataViewSpec } from '@kbn/data-views-plugin/common';
import type { AsCodeRuntimeField } from '@kbn/as-code-data-views-schema';

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
