/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { set } from '@kbn/safer-lodash-set';
import type { FieldMap, MultiField } from './types';

export function mappingFromFieldMap(
  fieldMap: FieldMap,
  dynamic: 'strict' | boolean = 'strict'
): MappingTypeMapping {
  const mappings = {
    dynamic,
    properties: {},
  };

  const fields = Object.keys(fieldMap).map((key: string) => {
    const field = fieldMap[key];
    return {
      name: key,
      ...field,
    };
  });

  fields.forEach((field) => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { name, required, array, multi_fields, ...rest } = field;
    const mapped = multi_fields
      ? {
          ...rest,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          fields: multi_fields.reduce((acc, multi_field: MultiField) => {
            acc[multi_field.name] = {
              type: multi_field.type,
            };
            return acc;
          }, {} as Record<string, unknown>),
        }
      : rest;

    set(mappings.properties, field.name.split('.').join('.properties.'), mapped);

    if (name === '@timestamp') {
      set(mappings.properties, `${name}.ignore_malformed`, false);
    }
  });

  return mappings;
}
